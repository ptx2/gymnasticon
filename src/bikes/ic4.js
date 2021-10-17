import util from 'util';
import {EventEmitter} from 'events';
import {execFile} from 'child_process';
const execFileAsync = util.promisify(execFile);
import {scan} from '../util/ble-scan';
import {macAddress} from '../util/mac-address';

export const IC4_LOCALNAME = 'IC Bike';

// GATT service/characteristic UUIDs
const FTMS_SERVICE_UUID = '1826';
const INDOOR_BIKE_DATA_UUID = '2ad2';

// indoor bike data characteristic value parsing
const IBD_VALUE_MAGIC = Buffer.from([0x44]); // identifies indoor bike data message
const IBD_VALUE_IDX_POWER = 6; // 16-bit power (watts) data offset within packet
const IBD_VALUE_IDX_CADENCE = 4; // 16-bit cadence (1/2 rpm) data offset within packet
const IBD_VALUE_IDX_SPEED = 2; // 16-bit cadence (1/100 km/h) data offset within packet

const debuglog = require('debug')('gym:bikes:ic4');

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
   * @param {function} filter - filter to specify bike when more than one is present
   */
  constructor(noble, filter) {
    super();
    this.noble = noble;
    this.filter = filter;
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
    this.peripheral = await scan(this.noble, [FTMS_SERVICE_UUID], this.filter);

    // connect
    this.peripheral.on('disconnect', this.onDisconnect);
    await this.peripheral.connectAsync();

    // discover services/characteristics
    const {characteristics} = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [FTMS_SERVICE_UUID], [INDOOR_BIKE_DATA_UUID]);
    const [indoorBikeData] = characteristics;
    this.indoorBikeData = indoorBikeData;

    // subscribe to receive data
    this.indoorBikeData.on('read', this.onReceive);

    // Workaround for enabling notifications on the IC4 bike.
    //
    // Characteristic notifications are enabled by setting bit 0 of the Client
    // Characteristic Configuration Descriptor (CCCD) to 1.
    //
    // Using the hci-socket bindings, noble's subscribeAsync() translates to:
    //
    // => ATT Read By Type Request    # get cccd handle and value
    // <= ATT Read By Type Response
    // => ATT Write Request           # set new value with bit 0 set to 1
    //
    // However the IC4 bike never sends the Read By Type Response.
    //
    // So the workaround below does this instead:
    //
    // => ATT Find Info Request       # get all descriptor handles
    // <= ATT Find Info Response
    // => ATT Write Request           # set value to 1 (0100 uint16le)
    //
    //await this.indoorBikeData.subscribeAsync(); // doesn't work
    await this.indoorBikeData.discoverDescriptorsAsync();
    const cccd = this.indoorBikeData.descriptors.find(d => d.uuid == '2902');
    await cccd.writeValueAsync(Buffer.from([1,0])); // 0100 <- enable notifications

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
      const {power, cadence, speed} = parse(data);
      this.emit('stats', {power, cadence, speed});
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
    const speed = Math.round(data.readUInt16LE(IBD_VALUE_IDX_SPEED) / 100);
    return {power, cadence};
  }
  throw new Error('unable to parse message');
}
