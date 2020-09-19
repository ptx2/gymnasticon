import {Characteristic, Descriptor} from '@abandonware/bleno';

/**
 * Bluetooth LE GATT Cycling Power Feature Characteristic implementation.
 */
export class FitnessMachineFeatureCharacteristic extends Characteristic {
  constructor() {
    super({
      uuid: '2ACC',
      properties: ['read'],
      descriptors: [
        new Descriptor({
          uuid: '2901',
          value: 'Fitness Machine Feature'
        })
      ],
      value: Buffer.from([
        // Resistance Level Supported
        1,
        0,
        0,
        0,
        // Resistance Target Setting Supported
        32,
        0,
        0,
        0
      ])
    })
  }
}
