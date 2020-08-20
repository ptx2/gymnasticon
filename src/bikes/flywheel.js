import util from 'util';
import {EventEmitter} from 'events';
import {execFile} from 'child_process';
const execFileAsync = util.promisify(execFile);
import {scan} from '../util/ble-scan';
import {macAddress} from '../util/mac-address';

// GATT service/characteristic UUIDs
const UART_SERVICE_UUID = '6e400001b5a3f393e0a9e50e24dcca9e';
const UART_RX_UUID = '6e400002b5a3f393e0a9e50e24dcca9e';
const UART_TX_UUID = '6e400003b5a3f393e0a9e50e24dcca9e';

// stats packet parsing
const STATS_PKT_MAGIC = Buffer.from([0xff, 0x1f, 0x0c]); // identifies a stats packet
const STATS_PKT_IDX_POWER = 3; // 16-bit power (watts) data offset within packet
const STATS_PKT_IDX_CADENCE = 12; // 8-bit cadence (rpm) data offset within packet

// the bike's desired LE connection parameters (needed for BlueZ workaround)
const LE_MIN_INTERVAL = 16*1.25;
const LE_MAX_INTERVAL = 60*1.25;
const LE_LATENCY = 0;
const LE_SUPERVISION_TIMEOUT = 4000;

const debuglog = util.debuglog('flywheel');

/**
 * Handles communication with Flywheel indoor training bike using the bike's
 * proprietary protocol atop a standard Bluetooth LE GATT Nordic UART Service.
 */
export class FlywheelBikeClient extends EventEmitter {
  /**
   * Create a FlywheelBikeClient instance.
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
   * Establish a connection to the bike's Bluetooth LE GATT Nordic UART Service.
   */
  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    this.fixPowerDropout = createPowerDropoutFilter();

    // scan
    const peripheral = await scan(this.noble, [UART_SERVICE_UUID], this.filters);

    // connect
    peripheral.on('disconnect', this.onDisconnect);
    await peripheral.connectAsync();

    // workaround for bluez rejecting connection parameters
    await updateConnectionParameters(peripheral, LE_MIN_INTERVAL, LE_MAX_INTERVAL, LE_LATENCY, LE_SUPERVISION_TIMEOUT); // needed for hci bluez

    // discover services/characteristics
    const {characteristics} = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [UART_SERVICE_UUID], [UART_TX_UUID, UART_RX_UUID]);
    const [tx, rx] = characteristics;

    // subscribe to receive data
    tx.on('read', this.onReceive);
    await tx.subscribeAsync();

    this.tx = tx;
    this.rx = rx;
    this.state = 'connected';
    this.peripheral = peripheral;
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
      const {type, payload} = parse(data);
      if (type === 'stats') {
        const fixed = this.fixPowerDropout(payload);
        if (fixed.power !== payload.power) {
          debuglog(`*** replaced zero power with previous power ${fixed.power}`);
        }
        this.emit(type, fixed);
      }
    } catch (e) {
      if (!/unable to parse message/.test(e)) {
        throw e;
      }
    }
  }

  /**
   * Send data to the bike.
   * @param {buffer} data - raw data encoded in proprietary format.
   */
  async send(data) {
    if (this.state !== 'connected') {
      throw new Error('Not connected');
    }
    await this.rx.writeAsync(data);
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
    this.emit('disconnect', {address: this.perpiheral.address});
  }
}


/**
 * Parse Flywheel protocol message.
 * @param {buffer} data - raw data encoded in proprietary format
 * @returns {object} message - parsed message
 * @returns {string} message.type - message type
 * @returns {object} message.payload - message payload
 */
export function parse(data) {
  if (data.indexOf(STATS_PKT_MAGIC) === 0) {
    const power = data.readUInt16BE(STATS_PKT_IDX_POWER);
    const cadence = data.readUInt8(STATS_PKT_IDX_CADENCE);
    return {type: 'stats', payload: {power, cadence}};
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

/**
 * Workaround for an issue in the Flywheel Bike where it occasionally
 * incorrectly reports zero power (watts).
 *
 * @private
 */
function createPowerDropoutFilter() {
  let prev = null;

  /**
   * Returns stats payload with spurious zero removed.
   * @param {object} curr - current stats payload
   * @param {number} curr.power - power (watts)
   * @param {number} curr.cadence - cadence (rpm)
   * @returns {object} fixed - fixed stats payload
   * @returns {object} fixed.power - fixed power (watts)
   * @returns {object} fixed.cadence - cadence
   */
  return function (curr) {
    let fixed = {...curr};
    if (prev !== null && curr.power === 0 && curr.cadence > 0 && prev.power > 0) {
      fixed.power = prev.power;
    }
    prev = curr;
    return fixed;
  }
}
