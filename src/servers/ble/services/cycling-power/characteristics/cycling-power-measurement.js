import {Characteristic, Descriptor} from '@abandonware/bleno';

const FLAG_HASCRANKDATA = (1<<5);
const CRANK_TIMESTAMP_SCALE = 1024 / 1000; // timestamp resolution is 1/1024 sec

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
          uuid: '2902',
          value: Buffer.alloc(2)
        }),
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
	 * @param {object} [measurement.crank] - last crank event.
   * @param {number} measurement.crank.revolutions - revolution count at last crank event.
   * @param {number} measurement.crank.timestamp - timestamp at last crank event.
   */
  updateMeasurement({ power, crank }) {
    let flags = 0;

    const value = Buffer.alloc(8);
    value.writeInt16LE(power, 2);

    // include crank data if provided
    if (crank) {
      const revolutions16bit = crank.revolutions & 0xffff;
      const timestamp16bit = Math.round(crank.timestamp * CRANK_TIMESTAMP_SCALE) & 0xffff;
      value.writeUInt16LE(revolutions16bit, 4);
      value.writeUInt16LE(timestamp16bit, 6);
      flags |= FLAG_HASCRANKDATA;
    }

    value.writeUInt16LE(flags, 0);

    if (this.updateValueCallback) {
      this.updateValueCallback(value)
    }
  }
}
