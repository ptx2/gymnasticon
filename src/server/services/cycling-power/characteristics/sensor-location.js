import {Characteristic, Descriptor} from '@abandonware/bleno';

/**
 * Bluetooth LE GATT Sensor Location Characteristic implementation.
 */
export class SensorLocationCharacteristic extends Characteristic {
  constructor() {
    super({
      uuid: '2a5d',
      properties: ['read'],
      descriptors: [
        new Descriptor({
          uuid: '2901',
          value: 'Sensor Location'
        })
      ],
      value: Buffer.from([13]) // power value measured at rear hub
    })
  }
}
