import Ant from 'gd-ant-plus';
import {Timer} from '../../util/timer';

const debuglog = require('debug')('gym:servers:ant');

const CRANK_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec
const WHEEL_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec

const PWR_DEVICE_TYPE = 0x0b; // Bike Power Sensor
const PWR_DEVICE_NUMBER = 1;
const PWR_PERIOD = 8182; // 8182/32768 ~4hz PWR

const SAC_DEVICE_TYPE = 0x79; // Bike Speed and Cadence Sensor
const SAC_DEVICE_NUMBER = 2;
const SAC_PERIOD = 8086; // 8086/32768 ~4hz SPD+CDC

const RF_CHANNEL = 57; // 2457 MHz
const PERIOD = 8192 / 2 ; // 8 Hz; Send PWR & SaC data on every other cycle
const BROADCAST_INTERVAL = PERIOD / 32768; // seconds

const defaults = {
  deviceId: 11234,
}

/**
 * Handles communication with apps (e.g. Zwift) using the ANT+ Bicycle Power
 * profile (instantaneous cadence and power), as well as ANT+ Bicycle Speed
 * and Cadence profile (wheel rotations and timestamp).
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
    this.broadcastCycle = 0;

    this.pwr_channel = 1;
    this.power = 0;
    this.cadence = 0;
    this.eventCount = 0;
    this.accumulatedPower = 0;

    this.sac_deviceId = opts.deviceId + 1;
    this.sac_channel = 2;
    this.wheelRevolutions = 0;
    this.wheelTimestamp = 0;
    this.crankRevolutions = 0;
    this.crankTimestamp = 0;

    this.broadcastInterval = new Timer(BROADCAST_INTERVAL);
    this.broadcastInterval.on('timeout', this.onBroadcastInterval.bind(this));

    this._isRunning = false;
  }

  /**
   * Start the ANT+ server (setup channel and start broadcasting).
   */
  start() {
    const {stick, pwr_channel, sac_channel, pwr_deviceId, sac_deviceId} = this;

    // Initialize PWR channel
    const pwr_messages = [
      Ant.Messages.assignChannel(pwr_channel, 'transmit'),
      Ant.Messages.setDevice(pwr_channel, pwr_deviceId, PWR_DEVICE_TYPE, PWR_DEVICE_NUMBER),
      Ant.Messages.setFrequency(pwr_channel, RF_CHANNEL),
      Ant.Messages.setPeriod(pwr_channel, PWR_PERIOD),
      Ant.Messages.openChannel(pwr_channel),
    ];
    debuglog(`ANT+ server power start [deviceId=${pwr_deviceId} channel=${pwr_channel}]`);
    for (let pm of pwr_messages) {
      stick.write(pm);
    }

    // Initialize SaC channel
    const sac_messages = [
      Ant.Messages.assignChannel(sac_channel, 'transmit'),
      Ant.Messages.setDevice(sac_channel, sac_deviceId, SAC_DEVICE_TYPE, SAC_DEVICE_NUMBER),
      Ant.Messages.setFrequency(sac_channel, RF_CHANNEL),
      Ant.Messages.setPeriod(sac_channel, SAC_PERIOD),
      Ant.Messages.openChannel(sac_channel),
    ];
    debuglog(`ANT+ server speed and cadence start [deviceId=${sac_deviceId} channel=${sac_channel}]`);
    for (let scm of sac_messages) {
      stick.write(scm);
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
    const {stick, pwr_channel, sac_channel} = this;
    this.broadcastInterval.cancel();

    const pwr_messages = [
      Ant.Messages.closeChannel(pwr_channel),
      Ant.Messages.unassignChannel(pwr_channel),
    ];

    const sac_messages = [
      Ant.Messages.closeChannel(sac_channel),
      Ant.Messages.unassignChannel(sac_channel),
    ];

    // Close PWR and SaC channels
    // Wait between PWR and SaC close messages
    for (let pm of pwr_messages) {
      stick.write(pm);
    }
    for (let scm of sac_messages) {
      stick.write(scm);
    }
  }

  /**
   * Update instantaneous power, cadence and wheel revolution data.
   * @param {object} measurement
   * @param {number} measurement.power - power in watts
   * @param {number} measurement.cadence - cadence in rpm
   * @param {object} measurement.crank - last crank event.
   * @param {number} measurement.crank.revolutions - revolution count at last crank event.
   * @param {number} measurement.crank.timestamp - timestamp at last crank event.
   * @param {object} measurement.wheel - last wheel event.
   * @param {number} measurement.wheel.revolutions - revolution count at last wheel event.
   * @param {number} measurement.wheel.timestamp - timestamp at last wheel event.
   */
  updateMeasurement({ power, cadence, crank, wheel }) {
    this.power = power;
    this.cadence = cadence;
    if (crank) {
      this.crankRevolutions = crank.revolutions;
      this.crankTimestamp = Math.round(crank.timestamp * CRANK_TIMESTAMP_SCALE) & 0xffff;
    }
    if (wheel) {
      this.wheelRevolutions = wheel.revolutions;
      this.wheelTimestamp = Math.round(wheel.timestamp * WHEEL_TIMESTAMP_SCALE) & 0xffff;
    }
  }

  /**
   * Broadcast instantaneous power, cadence and wheel revolution data.
   */
  onBroadcastInterval() {
    const {stick, pwr_channel, sac_channel, power, cadence, broadcastCycle} = this;

    // Send PWR and SaC data alternating on every other 8 Hz cycle
    if (broadcastCycle %2 == 0) {
      // Build PWR broadcast message
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
      this.eventCount++;
      this.eventCount &= 0xff;
      // Send broadcast messages
      const pwr_messages = [
        Ant.Messages.broadcastData(pwr_data),
      ];
      debuglog(`ANT+ broadcast power power=${power}W cadence=${cadence}rpm accumulatedPower=${this.accumulatedPower}W eventCount=${this.eventCount}`);
      for (let pm of pwr_messages) {
        stick.write(pm);
      }
    } else {
      // Build SaC broadcast message
      const sac_data = [
        sac_channel,
        ...Ant.Messages.intToLEHexArray(this.crankTimestamp, 2),      // Last crank event Time
        ...Ant.Messages.intToLEHexArray(this.crankRevolutions, 2),    // Crank revolution Count
        ...Ant.Messages.intToLEHexArray(this.wheelTimestamp, 2),      // Last wheel event Time
        ...Ant.Messages.intToLEHexArray(this.wheelRevolutions, 2),    // Wheel revolution Count
      ];
      const sac_messages = [
        Ant.Messages.broadcastData(sac_data),
      ];
      // Send broadcast messages
      debuglog(`ANT+ broadcast cadence revolutions=${this.crankRevolutions} cadence timestamp=${this.crankTimestamp} speed revolutions=${this.wheelRevolutions} timestamp=${this.wheelTimestamp}`);
      for (let scm of sac_messages) {
        stick.write(scm);
      }
    }
    this.broadcastCycle++;
  }
}
