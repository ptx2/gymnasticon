import Ant from 'gd-ant-plus';
import {Timer} from '../../util/timer';

const debuglog = require('debug')('gym:servers:ant');

const WHEEL_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec

const PWR_DEVICE_TYPE = 0x0b; // Bike Power Sensors
const PWR_DEVICE_NUMBER = 1;
const PWR_PERIOD = 8182; // 8182/32768 ~4hz PWR

const SPD_DEVICE_TYPE = 0x7b; // Bike Speed Sensors
const SPD_DEVICE_NUMBER = 2;
const SPD_PERIOD = 8118; // 8118/32768 ~4hz SPD

const RF_CHANNEL = 57; // 2457 MHz
const PERIOD = 8182;
const BROADCAST_INTERVAL = PERIOD / 32768; // seconds

const defaults = {
  deviceId: 11234,
}

/**
 * Handles communication with apps (e.g. Zwift) using the ANT+ Bicycle Power
 * profile (instantaneous cadence and power), as well as ANT+ Bicycle Speed
 * profile (wheel rotations and timestamp).
 */
export class AntServer {
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
    this.pwr_deviceId = opts.deviceId;
    this.pwr_channel = 1;
    this.power = 0;
    this.cadence = 0;
    this.eventCount = 0;
    this.accumulatedPower = 0;

    this.spd_deviceId = opts.deviceId + 1;
    this.spd_channel = 2;
    this.wheelRevolutions = 0;
    this.wheelTimestamp = 0;
    this.wheelCount = 0;

    this.broadcastInterval = new Timer(BROADCAST_INTERVAL);
    this.broadcastInterval.on('timeout', this.onBroadcastInterval.bind(this));

    this._isRunning = false;
  }

  /**
   * Start the ANT+ server (setup channel and start broadcasting).
   */
  start() {
    const {stick, pwr_channel, spd_channel, pwr_deviceId, spd_deviceId} = this;
    const pwr_messages = [
      Ant.Messages.assignChannel(pwr_channel, 'transmit_only'),
      Ant.Messages.setDevice(pwr_channel, pwr_deviceId, PWR_DEVICE_TYPE, PWR_DEVICE_NUMBER),
      Ant.Messages.setFrequency(pwr_channel, RF_CHANNEL),
      Ant.Messages.setPeriod(pwr_channel, PWR_PERIOD),
      Ant.Messages.openChannel(pwr_channel),
    ];
    debuglog(`ANT+ server power start [deviceId=${pwr_deviceId} channel=${pwr_channel}]`);
    for (let pm of pwr_messages) {
      stick.write(pm);
    }

    const spd_messages = [
      Ant.Messages.assignChannel(spd_channel, 'transmit_only'),
      Ant.Messages.setDevice(spd_channel, spd_deviceId, SPD_DEVICE_TYPE, SPD_DEVICE_NUMBER),
      Ant.Messages.setFrequency(spd_channel, RF_CHANNEL),
      Ant.Messages.setPeriod(spd_channel, SPD_PERIOD),
      Ant.Messages.openChannel(spd_channel),
    ];
    debuglog(`ANT+ server speed start [deviceId=${spd_deviceId} channel=${spd_channel}]`);
    for (let sm of spd_messages) {
      stick.write(sm);
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
    const {stick, pwr_channel, spd_channel} = this;
    this.broadcastInterval.cancel();
    const pwr_messages = [
      Ant.Messages.closeChannel(pwr_channel),
      Ant.Messages.unassignChannel(pwr_channel),
    ];
    for (let pm of pwr_messages) {
      stick.write(pm);
    }
    const spd_messages = [
      Ant.Messages.closeChannel(spd_channel),
      Ant.Messages.unassignChannel(spd_channel),
    ];
    for (let sm of spd_messages) {
      stick.write(sm);
    }
  }

  /**
   * Update instantaneous power, cadence and wheel revolution data.
   * @param {object} measurement
   * @param {number} measurement.power - power in watts
   * @param {number} measurement.cadence - cadence in rpm
   * @param {object} measurement.wheel - last wheel event.
   * @param {number} measurement.wheel.revolutions - revolution count at last wheel event.
   * @param {number} measurement.wheel.timestamp - timestamp at last wheel event.
   */
  updateMeasurement({ power, cadence, wheel }) {
    this.power = power;
    this.cadence = cadence;
    if (wheel) {
      this.wheelRevolutions = wheel.revolutions;
      this.wheelTimestamp = Math.round(wheel.timestamp * WHEEL_TIMESTAMP_SCALE) & 0xffff;
    }
  }

  /**
   * Broadcast instantaneous power, cadence and wheel revolution data.
   */
  onBroadcastInterval() {
    const {stick, pwr_channel, spd_channel, power, cadence} = this;

    this.accumulatedPower += power;
    this.accumulatedPower &= 0xffff;
    const pwr_data = [
      pwr_channel,
      0x10, // power only
      this.eventCount,
      0xff, // pedal power not used
      cadence,
      ...Ant.Messages.intToLEHexArray(this.accumulatedPower, 2),
      ...Ant.Messages.intToLEHexArray(power, 2),
    ];
    debuglog(`ANT+ broadcast power power=${power}W cadence=${cadence}rpm accumulatedPower=${this.accumulatedPower}W eventCount=${this.eventCount}`);

    this.eventCount++;
    this.eventCount &= 0xff;

    const spd_data = [
      spd_channel,
      ...Ant.Messages.intToLEHexArray(0x0, 4),                      // Unused for SPD only sensor
      ...Ant.Messages.intToLEHexArray(this.wheelTimestamp, 2),      // Last event Time
      ...Ant.Messages.intToLEHexArray(this.wheelRevolutions, 2),    // Revolution Count
    ];

    /**
     * Sending SPD data twice in this order leads to more receiver stability.
     */
    const messages = [
      Ant.Messages.broadcastData(spd_data),
      Ant.Messages.broadcastData(pwr_data),
      Ant.Messages.broadcastData(spd_data),
    ];
    debuglog(`ANT+ broadcast speed revolutions=${this.wheelRevolutions} timestamp=${this.wheelTimestamp}`);

    for (let m of messages) {
      stick.write(m);
    }
  }
}
