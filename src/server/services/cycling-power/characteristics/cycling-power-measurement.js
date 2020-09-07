import {Characteristic, Descriptor} from '@abandonware/bleno';

const FLAG_HASCRANKDATA = (1<<5);
const CRANK_TIMESTAMP_SCALE = 1000 / 1024; // timestamp resolution is 1/1024 sec

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
    this.lastcrank = false;
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

    // include new crank data if provided
    if (crank) {
      console.log("Sending new TS")
      const revolutions16bit = crank.revolutions & 0xffff;
      const timestamp16bit = Math.floor(crank.timestamp * CRANK_TIMESTAMP_SCALE) & 0xffff;
      value.writeUInt16LE(revolutions16bit, 4);
      value.writeUInt16LE(timestamp16bit, 6);
      flags |= FLAG_HASCRANKDATA;
      this.lastcrank = crank;
    }
    else {
      /* Some devices (Garmin Edge)  oscillate between a populated cadence value
         and not displaying a value if the BLE frame doesn't contain a crank update.
         While the spec itself allows for this, we can work around it by resending the
         same timestamp + crank revolution number, which will keep the device from
         both displaying a null value as well as from calculating it into the displayed
         number.
      */
      if (this.lastcrank) {
        const revolutions16bit = this.lastcrank.revolutions & 0xffff;
        const timestamp16bit = Math.floor(this.lastcrank.timestamp * CRANK_TIMESTAMP_SCALE) & 0xffff;
        value.writeUInt16LE(revolutions16bit, 4);
        value.writeUInt16LE(timestamp16bit, 6);
        flags |= FLAG_HASCRANKDATA;
      }
    }
  

    value.writeUInt16LE(flags, 0);

    if (this.updateValueCallback) {
      this.updateValueCallback(value)
    }
  }
}
