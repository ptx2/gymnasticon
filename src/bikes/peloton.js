import {once, EventEmitter} from 'events';
import util from 'util';

const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')

const PACKET_DELIMITER = Buffer.from('f6', 'hex');

const debuglog = util.debuglog('gymnasticon:bikes:peloton');

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
  }

  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    this._port = new SerialPort(this.path, {baudRate: 19200, autoOpen: false});
    const open = util.promisify(this._port.open.bind(this._port));
    await open();
    this._port.on('close', this.onSerialClose);
    this._parser = this._port.pipe(new Delimiter({ delimiter: PACKET_DELIMITER }));
    const connected = once(this._parser, 'data');
    this._parser.on('data', this.onSerialMessage);
    // consider the connection established when the first packet arrives
    await connected;

    this.state = 'connected';
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
    switch(data[1]) {
    case 65:
      this.cadence = decodePeloton(data, data[2], false);
      this.onStatsUpdate();
      return;
    case 68:
      this.power = decodePeloton(data, data[2], true);
      this.onStatsUpdate();
      return;
    }
  }

  onSerialClose() {
    this.emit('disconnect', {address: this.address});
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
