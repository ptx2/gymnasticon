import {once, EventEmitter} from 'events';
import {Timer} from '../util/timer';
import util from 'util';
import { trace } from 'console';

const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')

const PACKET_DELIMITER = Buffer.from('f6', 'hex');
const STATS_TIMEOUT = 1.0;

const debuglog = util.debuglog('gymnasticon:bikes:peloton');
const tracelog = util.debuglog('gymnasticon:bikes:peloton:trace');

export class PelotonBikeClient extends EventEmitter {
  /**
   * Create a PelotonBikeClient instance.
   * @param {string} path - device path to usb serial device
   */
  constructor(path) {
    super();
    this.path = path;

    this.onStatsUpdate = this.onStatsUpdate.bind(this);
    this.onSerialMessage = this.onSerialMessage.bind(this);
    this.onSerialClose = this.onSerialClose.bind(this);

    // initial stats
    this.power = 0;
    this.cadence = 0;

    // reset stats to 0 when the user leaves the ride screen or turns the bike off
    this.statsTimeout = new Timer(STATS_TIMEOUT, {repeats: false});
    this.statsTimeout.on('timeout', this.onStatsTimeout.bind(this));
  }

  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    this._port = new SerialPort(this.path, {baudRate: 19200, autoOpen: false});
    const open = util.promisify(this._port.open.bind(this._port));
    await open();
    tracelog("Serial Opened")
    this._port.on('close', this.onSerialClose);
    this._parser = this._port.pipe(new Delimiter({ delimiter: PACKET_DELIMITER }));
    this._parser.on('data', this.onSerialMessage);

    this.state = 'connected';
    tracelog("Serial Connected");
  }

  /**
   * Get the bike's MAC address.
   * @returns {string} mac address
   */
  get address() {
    return this._port.path;
  }

  /**
   * @private
   */
  onStatsUpdate() {
    const {power, cadence} = this;
    this.emit('stats', {power, cadence});
  }

  onSerialMessage(data) {
    tracelog("RECV: ", data);
    switch(data[1]) {
      case 65:
        this.cadence = decodePeloton(data, data[2], false);
        this.onStatsUpdate();
        this.statsTimeout.reset();
        return;
      case 68:
        this.power = decodePeloton(data, data[2], true);
        this.onStatsUpdate();
        this.statsTimeout.reset();
        return;
      default:
        debuglog("Unrecognized Message Type: ", data[1]);
        return;
      }
  }

  onSerialClose() {
    this.emit('disconnect', {address: this.address});
    tracelog("Serial Closed");
  }

  onStatsTimeout() {
    this.power = 0;
    this.cadence = 0;
    tracelog("StatsTimeout exceeded");
    this.onStatsUpdate();
  }
}

export function decodePeloton(bufferArray, byteLength, isPower) {
  let decimalPlace = 1;
  let precision = 0.0;
  let accumulator = 0;
  let iteratorOffset = 3;

  for (let iteratorTemp = iteratorOffset; iteratorTemp < iteratorOffset + byteLength; iteratorTemp++) {
    let offsetVal = bufferArray[iteratorTemp] - 48;
    if (offsetVal < 0 || offsetVal > 9) {
      debuglog("invalid value detected: ", offsetVal);
      return;
    }

    if (!isPower || iteratorTemp != iteratorOffset) {
      accumulator += (offsetVal * decimalPlace);
      decimalPlace *= 10;
    } else {
      precision = decimalPlace * offsetVal / 10.0;
    }
  }

  return accumulator + precision;
}
