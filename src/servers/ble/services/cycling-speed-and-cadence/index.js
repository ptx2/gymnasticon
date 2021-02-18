import {PrimaryService} from '@abandonware/bleno';
import {CscMeasurementCharacteristic} from './characteristics/csc-measurement';
import {CscFeatureCharacteristic} from './characteristics/csc-feature';

/**
 * Bluetooth LE GATT Cycling Speed and Cadence Service implementation.
 */
export class CyclingSpeedAndCadenceService extends PrimaryService {
  /**
   * Create a CyclingSpeedAndCadenceService instance.
   */
  constructor() {
    super({
      uuid: '1816',
      characteristics: [
        new CscMeasurementCharacteristic(),
        new CscFeatureCharacteristic(),
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
  updateMeasurement(measurement) {
    this.characteristics[0].updateMeasurement(measurement)
  }
}
