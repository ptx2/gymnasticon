import util from 'util';
import {EventEmitter} from 'events';
import {execFile} from 'child_process';
const execFileAsync = util.promisify(execFile);
import {scan} from '../util/ble-scan';
import {macAddress} from '../util/mac-address';

// GATT service/characteristic UUIDs
const FTMS_SERVICE_UUID = '1826';
const INDOOR_BIKE_DATA_UUID = '2ad2';

// indoor bike data characteristic value parsing
const IBD_VALUE_MAGIC = Buffer.from([0x44]); // identifies indoor bike data message
const IBD_VALUE_IDX_POWER = 6; // 16-bit power (watts) data offset within packet
const IBD_VALUE_IDX_CADENCE = 4; // 16-bit cadence (1/2 rpm) data offset within packet

// the bike's desired LE connection parameters (needed for BlueZ workaround)
const LE_MIN_INTERVAL = 24*1.25;
const LE_MAX_INTERVAL = 40*1.25;
const LE_LATENCY = 0;
const LE_SUPERVISION_TIMEOUT = 420;

const debuglog = util.debuglog('gymnasticon:bikes:ic4');

/**
 * Handles communication with Schwinn IC4 indoor training bike using the standard
 * Bluetooth LE GATT Fitness Machine Service. Zwift already supports this service
 * but you may still want to run it through Gymnasticon to adjust the bike's
 * inaccurate power values.
 */
export class Ic4BikeClient extends EventEmitter {
  /**
   * Create a Ic4BikeClient instance.
   * @param {Noble} noble - a Noble instance.
   * @param {object} filters - filters to specify bike when more than one is present
   * @param {string} filters.address - mac address
   * @param {string} filters.name - device name
   */
  constructor(noble, filters) {
    super();
    this.noble = noble;
    this.filters = filters;
    this.state = 'disconnected';
    this.onReceive = this.onReceive.bind(this);
    this.onDisconnect = this.onDisconnect.bind(this);
  }

  /**
   * Establish a connection to the bike's Bluetooth LE GATT Fitness Machine Service.
   */
  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    // scan
    this.peripheral = await scan(this.noble, [FTMS_SERVICE_UUID], this.filters);

    // connect
    this.peripheral.on('disconnect', this.onDisconnect);
    await this.peripheral.connectAsync();

    // workaround for bluez rejecting connection parameters
    await updateConnectionParameters(this.peripheral, LE_MIN_INTERVAL, LE_MAX_INTERVAL, LE_LATENCY, LE_SUPERVISION_TIMEOUT); // needed for hci bluez

    // discover services/characteristics
    const {characteristics} = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [FTMS_SERVICE_UUID], [INDOOR_BIKE_DATA_UUID]);
    const [indoorBikeData] = characteristics;
    this.indoorBikeData = indoorBikeData;

    // subscribe to receive data
    this.indoorBikeData.on('read', this.onReceive);
    await this.indoorBikeData.subscribeAsync();

    this.state = 'connected';
  }

  /**
   * Get the bike's MAC address.
   * @returns {string} mac address
   */
  get address() {
    return macAddress(this.peripheral.address);
  }

  /**
   * Handle data received from the bike.
   * @param {buffer} data - raw data encoded in proprietary format.
   * @emits BikeClient#data
   * @emits BikeClient#stats
   * @private
   */
  onReceive(data) {
    /**
     * Data event.
     *
     * @event BikeClient#data
     * @type {buffer}
     */
    this.emit('data', data);

    try {
      const {power, cadence} = parse(data);
      this.emit('stats', {power, cadence});
    } catch (e) {
      if (!/unable to parse message/.test(e)) {
        throw e;
      }
    }
  }

  /**
   * Disconnect from the bike.
   */
  async disconnect() {
    if (this.state !== 'disconnected') return;
    await this.peripheral.disconnectAsync();
  }

  /**
   * Handle bike disconnection.
   * @emits BikeClient#disconnect
   * @private
   */
  onDisconnect() {
    this.state = 'disconnected';
    this.peripheral.off('disconnect', this.onDisconnect);

    /**
     * Disconnect event.
     * @event BikeClient#disconnect
     * @type {object}
     * @property {string} address - mac address
     */
    this.emit('disconnect', {address: this.peripheral.address});
  }
}


/**
 * Parse Indoor Bike Data characteristic value.
 * @param {buffer} data - raw characteristic value.
 * @returns {object} message - parsed message
 * @returns {string} message.type - message type
 * @returns {object} message.payload - message payload
 */
export function parse(data) {
  // In the spec, this value can have a lot of optional fields which means
  // the offset of power or cadence can vary depending on what other data is
  // present.
  //
  // However this bike always uses the same format:
  //
  // 0x02      0x44
  // 0b0000001001000100
  //         H  C   P S
  // H - heartrate (present when flag is 1)
  // C - cadence (present when flag is 1)
  // P - power (present when flag is 1)
  // S - speed (present when flag is 0)
  //
  // So we can simplify the decoding to:
  if (data.indexOf(IBD_VALUE_MAGIC) === 0) {
    const power = data.readInt16LE(IBD_VALUE_IDX_POWER);
    const cadence = Math.round(data.readUInt16LE(IBD_VALUE_IDX_CADENCE) / 2);
    return {power, cadence};
  }
  throw new Error('unable to parse message');
}


/**
 * Workaround for an issue with BlueZ.
 *
 * The BlueZ stack rejects the bike's request to update connection
 * parameters causing the bike to drop its connection after 30 seconds
 *
 * Tried setting these prior to connecting, to no avail:
 *
 * /sys/debug/kernel/bluetooth/hci0/conn_min_interval
 * /sys/debug/kernel/bluetooth/hci0/conn_max_interval
 * /sys/debug/kernel/bluetooth/hci0/supervision_timeout
 *
 * Tried using noble's HCI_CHANNEL_USER implementation where noble takes
 * exclusive control of the adapter and handles the connection parameters
 * request itself. this works but since it takes exclusive control it
 * prevents bleno from working.
 *
 * The solution here is to run `hcitool lecup` with the bike's preferred
 * connection parameters after the connection is established.
 *
 * @private
 */
async function updateConnectionParameters(peripheral, minInterval, maxInterval, latency, supervisionTimeout) {
  const noble = peripheral._noble;
  if (noble._bindings._hci) {
    const handle = noble._bindings._handles[peripheral.uuid];
    //this.noble._bindings._hci.connUpdateLe(handle, minInterval, maxInterval, latency, supervisionTimeout);
    const cmd = '/usr/bin/hcitool'
    const args = [
      'lecup',
      '--handle', `${handle}`,
      '--min', `${Math.floor(minInterval/1.25)}`,
      '--max', `${Math.floor(maxInterval/1.25)}`,
      '--latency', '0',
      '--timeout', `${Math.floor(supervisionTimeout/10)}`,
    ]
    await execFileAsync(cmd, args);
  }
}
