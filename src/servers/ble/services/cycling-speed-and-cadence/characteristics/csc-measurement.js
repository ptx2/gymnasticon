import {Characteristic, Descriptor} from '@abandonware/bleno';

const FLAG_HASCRANKDATA = (1<<1);
const CRANK_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec

/**
 * Bluetooth LE GATT CSC Measurement Characteristic implementation.
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
   */
  updateMeasurement({ crank }) {
    let flags = 0;

    const value = Buffer.alloc(5);

    const revolutions16bit = crank.revolutions & 0xffff;
    const timestamp16bit = Math.round(crank.timestamp * CRANK_TIMESTAMP_SCALE) & 0xffff;
    value.writeUInt16LE(revolutions16bit, 1);
    value.writeUInt16LE(timestamp16bit, 3);
    flags |= FLAG_HASCRANKDATA;

    value.writeUInt8(flags, 0);

    if (this.updateValueCallback) {
      this.updateValueCallback(value)
    }
  }
}
