import {once, EventEmitter} from 'events';
import util from 'util';

/**
 * Bluetooth LE GATT Server.
 */
export class BleServer extends EventEmitter {
  /**
   * Create a BleServer instance.
   * @param {Bleno} bleno - a Bleno instance.
   * @param {string} name - the name used in advertisement.
   * @param {PrimaryService[]} - the GATT service instances.
   */
  constructor(bleno, name, services) {
    super();
    this.state = 'stopped'; // stopped | starting | started | connected
    this.bleno = bleno;
    this.name = name;
    this.services = services;
    this.uuids = services.map(s => s.uuid);
    this.bleno.on('accept', this.onAccept.bind(this));
    this.bleno.on('disconnect', this.onDisconnect.bind(this));
    this.bleno.startAdvertisingAsync = util.promisify(this.bleno.startAdvertising);
    this.bleno.stopAdvertisingAsync = util.promisify(this.bleno.stopAdvertising);
    this.bleno.setServicesAsync = util.promisify(this.bleno.setServices);
  }

  /**
   * Advertise and wait for connection.
   */
  async start() {
    if (this.state !== 'stopped') {
      throw new Error('already started');
    }

    this.state = 'starting';
    await once(this.bleno, 'stateChange');
    await this.bleno.startAdvertisingAsync(this.name, this.uuids);
    await this.bleno.setServicesAsync(this.services);
    this.state = 'started';
  }

  /**
   * Disconnect any active connection and stop advertising.
   */
  async stop() {
    if (this.state === 'stopped') return;

    await this.bleno.stopAdvertisingAsync();
    this.bleno.disconnect();
  }

  /**
   * Handle connection from a Bluetooth LE Central device (client).
   * @param {string} address - MAC address of device.
   * @emits BleServer#connect
   * @private
   */
  onAccept(address) {
    /**
     * Connect event.
     * @event BleServer#connect
     * @type {string} address - MAC address of device.
     */
    this.emit('connect', address);
  }

  /**
   * Handle disconnection of a Bluetooth LE Central device.
   * @param {string} address - MAC address of device.
   * @emits BleServer#disconnect
   * @private
   */
  onDisconnect(address) {
    /**
     * Disconnect event.
     * @event BleServer#disconnect
     * @type {string} address - MAC address of device.
     */
    this.emit('disconnect', address);
  }
}
