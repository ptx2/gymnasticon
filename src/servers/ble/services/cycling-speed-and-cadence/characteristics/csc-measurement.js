import {Characteristic, Descriptor} from '@abandonware/bleno';

const debuglog = require('debug')('gym:servers:ble');

const FLAG_HASCRANKDATA = (1<<1);
const FLAG_HASSPEEDDATA = (1<<0);
const CRANK_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec
const WHEEL_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec

/**
 * Bluetooth LE GATT CSC Measurement Characteristic implementation.
 * https://www.bluetooth.com/wp-content/uploads/Sitecore-Media-Library/Gatt/Xml/Characteristics/org.bluetooth.characteristic.csc_measurement.xml
 */
export class CscMeasurementCharacteristic extends Characteristic {
  constructor() {
    super({
      uuid: '2a5b',
      properties: ['notify'],
      descriptors: [
        new Descriptor({
          uuid: '2903',
          value: Buffer.alloc(2)
        })
      ]
    })
  }

  /**
   * Notify subscriber (e.g. Zwift) of new CSC Measurement.
   * @param {object} measurement - new csc measurement.
   * @param {object} measurement.crank - last crank event.
   * @param {number} measurement.crank.revolutions - revolution count at last crank event.
   * @param {number} measurement.crank.timestamp - timestamp at last crank event.
   * @param {object} measurement.wheel - last wheel event.
   * @param {number} measurement.wheel.revolutions - revolution count at last wheel event.
   * @param {number} measurement.wheel.timestamp - timestamp at last wheel event.
   */
  updateMeasurement({ crank, wheel }) {
    let flags = 0;
    let debugOutput = "";

    if ( crank && wheel ) {

      const value = Buffer.alloc(11);

      const wheelRevolutions32bit = wheel.revolutions & 0xffffffff;
      const wheelTimestamp16bit = Math.round(wheel.timestamp * WHEEL_TIMESTAMP_SCALE) & 0xffff;
      value.writeUInt32LE(wheelRevolutions32bit, 1);
      value.writeUInt16LE(wheelTimestamp16bit, 5);
      flags |= FLAG_HASSPEEDDATA;
      debugOutput += ` wheel revolutions=${wheelRevolutions32bit} wheel timestamp=${wheelTimestamp16bit}`

      const crankRevolutions16bit = crank.revolutions & 0xffff;
      const crankTimestamp16bit = Math.round(crank.timestamp * CRANK_TIMESTAMP_SCALE) & 0xffff;
      value.writeUInt16LE(crankRevolutions16bit, 7);
      value.writeUInt16LE(crankTimestamp16bit, 9);
      debugOutput += ` crank revolutions=${crankRevolutions16bit} crank timestamp=${crankTimestamp16bit}`
      flags |= FLAG_HASCRANKDATA;
      value.writeUInt8(flags, 0);
      
      debuglog(`BLE broadcast SPD+CDC${debugOutput} message=${value.toString('hex')}`);
      if (this.updateValueCallback) {
        this.updateValueCallback(value)
      }
    }
  }
}
