import {Characteristic, Descriptor} from '@abandonware/bleno';

const FLAG_HASCRANKDATA = (1<<5);
const CRANK_TIMESTAMP_SCALE = 1000 / 1024; // timestamp resolution is 1/1024 sec

/**
 * Bluetooth LE GATT Cycling Power Measurement Characteristic implementation.
 */
export class FitnessMachineControlPoint extends Characteristic {
  constructor() {
    super({
      uuid: '2AD9',
      properties: ['read', 'write'],
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
  onWriteRequest () {
      console.log('write request', arguments)
  }
  onReadRequest (a, callback) {
    console.log('read request', arguments)
    callback(Buffer.from([0x80, 1]))
  }

  /**
   * Notify subscriber (e.g. Zwift) of new Cycling Power Measurement.
   * @param {object} measurement - new cycling power measurement.
   * @param {number} measurement.power - current power (watts)
	 * @param {object} [measurement.crank] - last crank event.
   * @param {number} measurement.crank.revolutions - revolution count at last crank event.
   * @param {number} measurement.crank.timestamp - timestamp at last crank event.
   */
//   updateMeasurement({ power, crank }) {
//     let flags = 0;

//     const value = Buffer.alloc(8);
//     value.writeInt16LE(power, 2);

//     // include crank data if provided
//     if (crank) {
//       const revolutions16bit = crank.revolutions & 0xffff;
//       const timestamp16bit = Math.floor(crank.timestamp * CRANK_TIMESTAMP_SCALE) & 0xffff;
//       value.writeUInt16LE(revolutions16bit, 4);
//       value.writeUInt16LE(timestamp16bit, 6);
//       flags |= FLAG_HASCRANKDATA;
//     }

//     value.writeUInt16LE(flags, 0);

//     if (this.updateValueCallback) {
//       this.updateValueCallback(value)
//     }
//   }
}
