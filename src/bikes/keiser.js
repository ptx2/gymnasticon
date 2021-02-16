import util from 'util';
import {EventEmitter} from 'events';
import {scan} from '../util/ble-scan';
import {macAddress} from '../util/mac-address';

const KEISER_LOCALNAME = "M3";
const KEISER_VALUE_MAGIC = Buffer.from([0x02, 0x01]); // identifies Keiser data message
const KEISER_VALUE_IDX_POWER = 10; // 16-bit power (watts) data offset within packet
const KEISER_VALUE_IDX_CADENCE = 6; // 16-bit cadence (1/10 rpm) data offset within packet
const KEISER_VALUE_IDX_REALTIME = 4; // Indicates whether the data present is realtime (0, or 128 to 227)

const debuglog = util.debuglog('gymnasticon:bikes:keiser');

/**
 * Handles communication with Keiser bikes
 * Developer documentation can be found at https://dev.keiser.com/mseries/direct/
 */

export class KeiserBikeClient extends EventEmitter {
  /**
   * Create a KeiserBikeClient instance.
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
   * Bike behaves like a BLE beacon. Simulate connect by looking up MAC address
   * scanning and filtering subsequent announcements from this address.
   */
  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    // scan
    this.filters = {};
    this.filters.name = (v) => v == KEISER_LOCALNAME;
    this.peripheral = await scan(this.noble, null, this.filters);

    this.state = 'connected';

    // waiting for data
    await this.noble.startScanningAsync(null, true);
    this.noble.on('discover', this.onReceive);

    // Workaround for noble stopping to scan after connect to bleno
    // See https://github.com/noble/noble/issues/223
    this.noble.on('scanStop', this.scanStop);
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
    try {
      if (data.address == this.peripheral.address) {
        this.emit('data', data);
        const {power, cadence} = parse(data.advertisement.manufacturerData);
        debuglog('Found Keiser M3: ', data.advertisement.localName, ' Address: ', data.address, ' Data: ', data.advertisement.manufacturerData, 'Power: ', power, 'Cadence: ', cadence);
        this.emit('stats', {power, cadence});
      }
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
    await this.noble.stopScanningAsync();
  }

  onDisconnect() {
    this.state = 'disconnected';

  }

  scanStop() {
    debuglog('Restarting BLE Scan');
    this.startScanning(null, true);
  }

}

/**
 * Parse Keiser Bike Data characteristic value.
 * Consider if provided value are realtime or review mode
 * See https://dev.keiser.com/mseries/direct/#data-type
 * @param {buffer} data - raw characteristic value.
 * @returns {object} message - parsed message
 * @returns {string} message.type - message type
 * @returns {object} message.payload - message payload
 */
export function parse(data) {
  if (data.indexOf(KEISER_VALUE_MAGIC) === 0) {
    const realtime = data.readUInt8(KEISER_VALUE_IDX_REALTIME);
    if (realtime === 0 || (realtime > 128 && realtime < 255)) {
      // Realtime data received
      const power = data.readUInt16LE(KEISER_VALUE_IDX_POWER);
      const cadence = Math.round(data.readUInt16LE(KEISER_VALUE_IDX_CADENCE) / 10);
      return {power, cadence};
    }
  }
  throw new Error('unable to parse message');
}
