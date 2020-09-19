import {PrimaryService} from '@abandonware/bleno';
import {FitnessMachineFeatureCharacteristic} from './characteristics/fitness-machine-feature';
import {FitnessMachineControlPoint} from './characteristics/fitness-machine-control-point';
// import {SensorLocationCharacteristic} from './characteristics/sensor-location';

/**
 * Bluetooth LE GATT Cycling Power Service implementation.
 */
export class FitnessMachineService extends PrimaryService {
  /**
   * Create a FitnessMachineService instance.
   */
  constructor() {
    super({
      uuid: '1818',
      characteristics: [
        new FitnessMachineFeatureCharacteristic(),
        new FitnessMachineControlPoint(),
        // new SensorLocationCharacteristic(),
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
//   updateMeasurement(measurement) {
//     this.characteristics[0].updateMeasurement(measurement)
//   }
}
