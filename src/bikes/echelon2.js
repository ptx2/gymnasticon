import util from 'util';
import {EventEmitter} from 'events';
import {execFile} from 'child_process';
const execFileAsync = util.promisify(execFile);
import {scan} from '../util/ble-scan';
import {macAddress} from '../util/mac-address';

// GATT service/characteristic UUIDs
const ADVERTISED_SERVICE_UUID = '0bf669f045f211e795980800200c9a66';
const UART_SERVICE_UUID = '0bf669f145f211e795980800200c9a66';
const UART_RX_UUID = '0bf669f245f211e795980800200c9a66';
const UART_TX_UUID = '0bf669f445f211e795980800200c9a66';

// stats packet parsing
const STATS_PKT_TYPE_CADENCE = 0xD1;
const STATS_PKT_TYPE_RESISTANCE = 0xD2;
const STATS_PKT_IDX_TYPE = 1; // 8-bit packet type data offset within packet
const STATS_PKT_IDX_CADENCE = 10; // 8-bit cadence data offset within packet
const STATS_PKT_IDX_RESISTANCE = 3; // 8-bit resistance data offset within packet

const ENABLE_NOTIFICATIONS_PKT = Buffer.from([0xF0, 0xB0, 0x01, 0x01, 0xA2]);

const debuglog = util.debuglog('gymnasticon:bikes:echelon');

/**
 * Handles communication with Echelon indoor training bike using the bike's
 * proprietary protocol.
 */
export class EchelonBikeClient2 extends EventEmitter {
  /**
   * Create an EchelonBikeClient instance.
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
   * Establish a connection to the bike's Bluetooth LE GATT Service.
   */
  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    // scan
    this.peripheral = await scan(this.noble, [ADVERTISED_SERVICE_UUID], this.filters);

    // connect
    this.peripheral.on('disconnect', this.onDisconnect);
    await this.peripheral.connectAsync();

    // discover services/characteristics
    const {characteristics} = await this.peripheral.discoverSomeServicesAndCharacteristicsAsync(
      [UART_SERVICE_UUID], [UART_TX_UUID, UART_RX_UUID]);
    const [tx, rx] = characteristics;
    this.tx = tx;
    this.rx = rx;

    // initial stats
    this.stats = {
      cadence: 0,
      resistance: 0,
      power: 0,
    };

    // subscribe to receive data
    this.tx.on('read', this.onReceive);
    //await this.tx.subscribeAsync();
    await this.tx.discoverDescriptorsAsync();
    const cccd = this.tx.descriptors.find(d => d.uuid == '2902');
    await cccd.writeValueAsync(Buffer.from([1,0])); // 0100 <- enable notifications

    // start streaming stats
    await this.rx.writeAsync(ENABLE_NOTIFICATIONS_PKT, false);

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
      const {type, payload} = parse(data);
      if (type === 'cadence' || type === 'resistance') {
        this.stats = {
          ...this.stats,
          ...payload,
        };
        this.stats.power = calculatePower(this.stats.cadence, this.stats.resistance);
        this.emit('stats', this.stats);
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
    this.emit('disconnect', {address: this.peripheral.address});
  }
}


/**
 * Parse Echelon protocol message.
 * @param {buffer} data - raw data encoded in proprietary format
 * @returns {object} message - parsed message
 * @returns {string} message.type - message type
 * @returns {object} message.payload - message payload
 */
export function parse(data) {
  if (data.length >= 2) {
    const pktType = data.readUInt8(STATS_PKT_IDX_TYPE);
    switch (pktType) {
    case STATS_PKT_TYPE_CADENCE:
      const cadence = data.readUInt8(STATS_PKT_IDX_CADENCE);
      return {type: 'cadence', payload: {cadence}};

    case STATS_PKT_TYPE_RESISTANCE:
      const resistance = data.readUInt8(STATS_PKT_IDX_RESISTANCE);
      return {type: 'resistance', payload: {resistance}};
    }
  }
  throw new Error('unable to parse message');
}


/**
 * Calculate estimated power (watts) from cadence and resistance.
 * @param {number} cadence - rpm
 * @param {number} resistance - raw value from echelon data packet
 * @returns {number} power - watts
 */
export function calculatePower(cadence, resistance) {
  if (cadence === 0 || resistance === 0) return 0;
  return Math.round(Math.pow(1.090112, resistance) * Math.pow(1.015343, cadence) * 7.228958);
}
