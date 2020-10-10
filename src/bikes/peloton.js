import {once, EventEmitter} from 'events';
import {Timer} from '../util/timer';
import util from 'util';

const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')

const EMIT_RATE = .25;

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
    this.onEmitTimeout = this.onEmitTimeout.bind(this);

    // initial stats
    this.power = 0;
    this.cadence = 0;
    this._powerdirty = false;
    this._cadencedirty = false;

    this._emitTimer = new Timer(EMIT_RATE);
    this._emitTimer.on('timeout', this.onEmitTimeout);
  }

  async connect() {
    if (this.state === 'connected') {
      throw new Error('Already connected');
    }

    this._port = new SerialPort(this.path, { baudRate: 19200 });
    this._port.on('close', this.onSerialClose);
    this._parser = this._port.pipe(new Delimiter({ delimiter: PACKET_DELIMITER }));
    this._parser.on('data', this.onSerialMessage);

    this._emitTimer.reset();
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

  onEmitTimeout() {
    this._powerDirty = false;
    this._cadenceDirty = false;
  }

  onSerialMessage(data) {
    switch(data[1]) {
      case 65:
        if (!this._cadenceDirty) {
	 this.cadence = decodePeloton(data, data[2], false);
         this._cadenceDirty = true;
         this.onStatsUpdate();
	}
        return;
      case 68:
        if (!this._powerDirty) {
          this.power = decodePeloton(data, data[2], true);
	  this._powerDirty = true;
	  // Not calling onStatsUpdate because the peloton
	  // will always send a cadence and power message in rapid succession 	
        }
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
