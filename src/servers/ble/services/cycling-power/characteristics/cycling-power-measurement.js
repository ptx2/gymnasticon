import {Characteristic, Descriptor} from '@abandonware/bleno';

const debuglog = require('debug')('gym:servers:ble');

const FLAG_HASCRANKDATA = (1<<5);
const FLAG_HASSPEEDDATA = (1<<4);
const CRANK_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec
const WHEEL_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec

/**
 * Bluetooth LE GATT Cycling Power Measurement Characteristic implementation.
 */
export class CyclingPowerMeasurementCharacteristic extends Characteristic {
  constructor() {
    super({
      uuid: '2a63',
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
   * Notify subscriber (e.g. Zwift) of new Cycling Power Measurement.
   * @param {object} measurement - new cycling power measurement.
   * @param {number} measurement.power - current power (watts)
	 * @param {object} measurement.crank - last crank event.
   * @param {number} measurement.crank.revolutions - revolution count at last crank event.
   * @param {number} measurement.crank.timestamp - timestamp at last crank event.
   * @param {object} measurement.wheel - last wheel event.
   * @param {number} measurement.wheel.revolutions - revolution count at last wheel event.
   * @param {number} measurement.wheel.timestamp - timestamp at last wheel event.
   */
   */
  updateMeasurement({ power, crank, wheel }) {
    let flags = 0;

    const value = Buffer.alloc(14);
    value.writeInt16LE(power, 2);

    if (crank && wheel) {
      const wheelRevolutions32bit = wheel.revolutions & 0xffffffff;
      const wheelTimestamp16bit = Math.round(wheel.timestamp * WHEEL_TIMESTAMP_SCALE) & 0xffff;
      value.writeUInt32LE(wheelRevolutions32bit, 4);
      value.writeUInt16LE(wheelTimestamp16bit, 8);
      const crankRevolutions16bit = crank.revolutions & 0xffff;
      const crankTimestamp16bit = Math.round(crank.timestamp * CRANK_TIMESTAMP_SCALE) & 0xffff;
      value.writeUInt16LE(crankRevolutions16bit, 10);
      value.writeUInt16LE(crankTimestamp16bit, 12);
      flags |= FLAG_HASCRANKDATA;
      flags |= FLAG_HASSPEEDDATA;
    }

    value.writeUInt16LE(flags, 0);
    debuglog(`BLE broadcast PWR power=${power} message=${value.toString('hex')}`);
    if (this.updateValueCallback) {
      this.updateValueCallback(value)
    }
  }
}
