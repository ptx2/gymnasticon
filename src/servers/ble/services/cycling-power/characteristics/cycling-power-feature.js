import {Characteristic, Descriptor} from '@abandonware/bleno';

/**
 * Bluetooth LE GATT Cycling Power Feature Characteristic implementation.
 */
export class CyclingPowerFeatureCharacteristic extends Characteristic {
  constructor() {
    super({
      uuid: '2a65',
      properties: ['read'],
      descriptors: [
        new Descriptor({
          uuid: '2901',
          value: 'Cycling Power Feature'
        })
      ],
      //value: Buffer.from([12,0,0,0]) // wheel revolution data + crank revolution data
      value: Buffer.from([8,0,0,0]) // crank revolution data
    })
  }
}
