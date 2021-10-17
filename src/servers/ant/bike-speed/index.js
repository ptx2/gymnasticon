import Ant from 'gd-ant-plus';
import {Timer} from '../../../util/timer';

const debuglog = require('debug')('gym:servers:ant');

const WHEEL_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec

const DEVICE_TYPE = 0x7b; // Bike Speed Sensors
const DEVICE_NUMBER = 2;
const PERIOD = 8118; // 8118/32768 ~4hz
const RF_CHANNEL = 57; // 2457 MHz
const BROADCAST_INTERVAL = PERIOD / 32768; // seconds

const defaults = {
  deviceId: 11234,
  channel: 2,
}

/**
 * Handles communication with apps (e.g. Zwift) using the ANT+ Bicycle Power
 * profile (instantaneous cadence and power).
 */
export class AntBikeSpeed {
  /**
   * Create an AntServer instance.
   * @param {Ant.USBDevice} antStick - ANT+ device instance
   * @param {object} options
   * @param {number} options.channel - ANT+ channel
   * @param {number} options.deviceId - ANT+ device id
   */
  constructor(antStick, options = {}) {
    const opts = {...defaults, ...options};
    this.stick = antStick;
    this.deviceId = opts.deviceId + 1;
    this.channel = opts.channel;

    this.wheelRevolutions = 0;
    this.wheelTimestamp = 0;

    this.broadcastInterval = new Timer(BROADCAST_INTERVAL);
    this.broadcastInterval.on('timeout', this.onBroadcastInterval.bind(this));

    this._isRunning = false;
  }

  /**
   * Start the ANT+ server (setup channel and start broadcasting).
   */
  start() {
    const {stick, channel, deviceId} = this;
    console.log("max channels: ", stick.maxChannels);
    const messages = [
      Ant.Messages.assignChannel(channel, 'transmit_only'),
      Ant.Messages.setDevice(channel, deviceId, DEVICE_TYPE, DEVICE_NUMBER),
      Ant.Messages.setFrequency(channel, RF_CHANNEL),
      Ant.Messages.setPeriod(channel, PERIOD),
      Ant.Messages.openChannel(channel),
    ];
    debuglog(`ANT+ server start [deviceId=${deviceId} channel=${channel}]`);
    for (let m of messages) {
      stick.write(m);
    }
    this.broadcastInterval.reset();
    this._isRunning = true;
  }

  get isRunning() {
    return this._isRunning;
  }

  /**
   * Stop the ANT+ server (stop broadcasting and unassign channel).
   */
  stop() {
    const {stick, channel} = this;
    this.broadcastInterval.cancel();
    const messages = [
      Ant.Messages.closeChannel(channel),
      Ant.Messages.unassignChannel(channel),
    ];
    for (let m of messages) {
      stick.write(m);
    }
  }

  /**
   * Update instantaneous power and cadence.
   * @param {object} measurement
   * @param {object} measurement.wheel - last wheel event.
   * @param {number} measurement.wheel.revolutions - revolution count at last wheel event.
   * @param {number} measurement.wheel.timestamp - timestamp at last wheel event.
   */
  updateMeasurement({ wheel }) {
    this.wheelRevolutions = wheel.revolutions;
    this.wheelTimestamp = Math.round(wheel.timestamp * WHEEL_TIMESTAMP_SCALE) & 0xffff;
  }

  /**
   * Broadcast instantaneous power and cadence.
   */
  onBroadcastInterval() {
    const {stick, channel} = this;
    const data = [
      channel,
      0x0,
      0x0,
      0x0,
      0x0,
      ...Ant.Messages.intToLEHexArray(this.wheelTimestamp, 2),     // Event Time
      ...Ant.Messages.intToLEHexArray(this.wheelRevolutions, 2),   // Revolution Count
    ];
    const message = Ant.Messages.broadcastData(data);
    debuglog(`ANT+ broadcast speed revolutions=${this.wheelRevolutions} timestamp=${this.wheelTimestamp} message=${message.toString('hex')}`);
    stick.write(message);
  }
}
