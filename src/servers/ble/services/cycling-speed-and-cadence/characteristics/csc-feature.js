import {Characteristic, Descriptor} from '@abandonware/bleno';

/**
 * Bluetooth LE GATT CSC Feature Characteristic implementation.
 */
export class CscFeatureCharacteristic extends Characteristic {
  constructor() {
    super({
      uuid: '2a5c',
      properties: ['read'],
      descriptors: [
        new Descriptor({
          uuid: '2901',
          value: 'CSC Feature'
        })
      ],
      value: Buffer.from([2,0]) // crank revolution data
    })
  }
}
