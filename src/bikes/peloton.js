import {once, EventEmitter} from 'events';
import util from 'util';

const SerialPort = require('serialport')
const Delimiter = require('@serialport/parser-delimiter')

const PACKET_DELIMITER = Buffer.from('f6', 'hex');

const debuglog = util.debuglog('gymnasticon:bikes:peloton');

const MEASUREMENTS_HEX_ENUM = {
  RESISTANCE: "f6f54a3f",
  CADENCE: "f6f54136",
  POWER: "f6f54439"
}

export const RECEIVE_TRIGGER = {
  EVENT: "event",
  POLL: "poll"
}

export class PelotonBikeClient extends EventEmitter {
  /**
   * Create a PelotonBikeClient instance.
   * @param {string} path - device path to usb serial device
   * @param {string} receiveTrigger - whether measurements are received event or poll based
   */
  constructor(path, receiveTrigger) {
    super();
    this.path = path;
    this.receiveTrigger = receiveTrigger;

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
    this._parser.on('data', this.onSerialMessage);

    this.state = 'connected';

    debuglog(`Measurement receive trigger: ${this.receiveTrigger}`);
    if (this.receiveTrigger === RECEIVE_TRIGGER.POLL) {
      this.pollMeasurementData(this._port);
    }
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

  pollMeasurementData(port) {
    setInterval(function() {
      // request cadence
      port.write(Buffer.from(MEASUREMENTS_HEX_ENUM.CADENCE, 'hex'), function(err) {
        if (err) {
          return console.log('Error on write: ', err.message)
        }
      })

      setTimeout(function() {
        // request power
        port.write(Buffer.from(MEASUREMENTS_HEX_ENUM.POWER, 'hex'), function(err) {
          if (err) {
            return console.log('Error on write: ', err.message)
          }
        })
      }, 100)
    }, 200)
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
