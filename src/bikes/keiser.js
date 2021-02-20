import util from 'util';
import {EventEmitter} from 'events';
import {Timer} from '../util/timer';
import {scan} from '../util/ble-scan';
import {macAddress} from '../util/mac-address';

const KEISER_LOCALNAME = "M3";
const KEISER_VALUE_MAGIC = Buffer.from([0x02, 0x01]); // identifies Keiser data message
const KEISER_VALUE_IDX_POWER = 10; // 16-bit power (watts) data offset within packet
const KEISER_VALUE_IDX_CADENCE = 6; // 16-bit cadence (1/10 rpm) data offset within packet
const KEISER_VALUE_IDX_REALTIME = 4; // Indicates whether the data present is realtime (0, or 128 to 227)
const KEISER_STATS_TIMEOUT = 2.0; // If no stats have been received within this time, reset power and cadence to 0
const KEISER_BIKE_TIMEOUT = 300.0; // Consider bike disconnected if no stats have been received for 300 sec / 5 minutes

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
  }

  /**
   * Bike behaves like a BLE beacon. Simulate connect by looking up MAC address
   * scanning and filtering subsequent announcements from this address.
   */
  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    // Reset stats to 0 when bike suddenly dissapears
    this.statsTimeout = new Timer(KEISER_STATS_TIMEOUT, {repeats: false});
    this.statsTimeout.on('timeout', this.onStatsTimeout.bind(this));

    // Consider bike disconnected if no stats have been received for certain time
    this.bikeTimeout = new Timer(KEISER_BIKE_TIMEOUT, {repeats: false});
    this.bikeTimeout.on('timeout', this.onBikeTimeout.bind(this));

    // Create filter to fix power and cadence dropouts
    this.fixDropout = createDropoutFilter();

    // Scan for bike
    this.filters = {};
    this.filters.name = (v) => v == KEISER_LOCALNAME;
    this.peripheral = await scan(this.noble, null, this.filters);

    this.state = 'connected';

    // Waiting for data
    await this.noble.startScanningAsync(null, true);
    this.noble.on('discover', this.onReceive);

    // Workaround for noble stopping to scan after connect to bleno
    // See https://github.com/noble/noble/issues/223
    this.noble.on('scanStop', this.restartScan);
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
         const {type, payload} = parse(data.advertisement.manufacturerData);
         if (type === 'stats') {
           const fixed = this.fixDropout(payload);
           if (fixed.power !== payload.power) {
             debuglog(`*** replaced zero power with previous power ${fixed.power}`);
           }
           if (fixed.cadence !== payload.cadence) {
             debuglog(`*** replaced zero cadence with previous cadence ${fixed.cadence}`);
           }
           debuglog('Found Keiser M3: ', data.advertisement.localName, ' Address: ', data.address, ' Data: ', data.advertisement.manufacturerData, 'Power: ', fixed.power, 'Cadence: ', fixed.cadence);
           this.emit(type, fixed);
           this.statsTimeout.reset();
           this.bikeTimeout.reset();
         }
       }
     } catch (e) {
       if (!/unable to parse message/.test(e)) {
         throw e;
       }
     }
   }

  /**
   * Set power & cadence to 0 when the bike dissapears
   */
   async onStatsTimeout() {
    const reset = { power:0, cadence:0 };
    debuglog('Stats timeout exceeded');
    if (this.state === 'connected') {
      console.log("Stats timeout: Restarting BLE Scan");
      try {
        await this.noble.startScanningAsync(null, true);
      } catch (err) {
        console.log("Stats timeout: Unable to restart BLE Scan: " + err);
      }
    }
    this.emit('stats', reset);
  }

  /**
  * Consider Bike disconnected after certain time
  */
  onBikeTimeout() {
    debuglog('M3 Bike disconnected');
    this.state = 'disconnected';
    this.noble.off('scanStop', this.restartScan);
    this.emit('disconnect', {address: this.peripheral.address});
  }

  /**
   * Restart BLE scanning while in connected state
   * Workaround for noble stopping to scan after connect to bleno
   * See https://github.com/noble/noble/issues/223
   */
  async restartScan() {
    console.log("Restarting BLE Scan");
    try {
      await this.startScanningAsync(null, true);
    } catch (err) {
      console.log("Unable to restart BLE Scan: " + err);
    }
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
      return {type: 'stats', payload: {power, cadence}};
    }
  }
  throw new Error('unable to parse message');
}

/**
 * Workaround for an issue in the Keiser Bike where it occasionally
 * incorrectly reports zero cadence (rpm) or zero power (watts)
 * @private
 */
function createDropoutFilter() {
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
    if (prev !== null && curr.cadence === 0 && curr.power > 0 && prev.cadence > 0) {
      fixed.cadence = prev.cadence;
    }
    prev = curr;
    return fixed;
  }
}
