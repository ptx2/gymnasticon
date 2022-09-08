import {PrimaryService} from '@abandonware/bleno';
import {CyclingPowerMeasurementCharacteristic} from './characteristics/cycling-power-measurement';
import {CyclingPowerFeatureCharacteristic} from './characteristics/cycling-power-feature';
import {SensorLocationCharacteristic} from './characteristics/sensor-location';

/**
 * Bluetooth LE GATT Cycling Power Service implementation.
 */
export class CyclingPowerService extends PrimaryService {
  /**
   * Create a CyclingPowerService instance.
   */
  constructor() {
    super({
      uuid: '1818',
      characteristics: [
        new CyclingPowerMeasurementCharacteristic(),
        new CyclingPowerFeatureCharacteristic(),
        new SensorLocationCharacteristic(),
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
   * @param {object} [measurement.wheel] - last wheel event.
   * @param {number} measurement.wheel.revolutions - revolution count at last wheel event.
   * @param {number} measurement.wheel.timestamp - timestamp at last wheel event.
   */
  updateMeasurement(measurement) {
    this.characteristics[0].updateMeasurement(measurement)
  }
}
