import {EventEmitter} from 'events';

const CADENCE_DELTA = .5

/**
 * Emit pedal stroke events at a rate that matches the given target cadence.
 * The target cadence can be updated on-the-fly.
 */
export class Simulation extends EventEmitter {
  constructor() {
    super();
    this._cadence = 0;
    this._requestedCadence = 0;
    this._interval = Infinity;
    this._lastPedalTime = -Infinity;
    this._timeoutId = null;
  }

  /**
   * 
   * @param {number} cadence - the target cadence in rpm 
   * @private
   */
  updateInterval(x) {
    this._interval = x > 0 ? 1000 * (60 / x) : Infinity;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this.schedulePedal();
  }


  /**
   * Set the target cadence.
   * @param {number} cadence - the target cadence in rpm.
   */
  set cadence(x) {
    var newCadence = x
    if (this._requestedCadence != newCadence){
      this._cadence = newCadence;
      this.updateInterval(this._cadence);
      this._requestedCadence = newCadence
    }
  }


  /**
   * Get the current target cadence (rpm).
   */
  get cadence() {
    return this._requestedCadence;
  }

  /**
   * Handle a pedal event.
   * @emits Simulation#pedal
   * @private
   */
  onPedal() {
    let timeSinceLast = Date.now() - this._lastPedalTime;
    // Since the BLE timestamp is in units of 1/1024ths of a second
    // we have precision loss. This, with the fact that javascript
    // interval timers are not precise means we need to attempt to
    // correct on the fly. This brings the imprecision down from 5rpm
    // too high to around 1-2.
    let quantumLast = Math.floor(timeSinceLast * (1000 / 1024))
    let effectiveCadence = (60 * 1000) / quantumLast;
    console.log("Effective Cadence: " + effectiveCadence);
    this._lastPedalTime = Date.now();
    if (timeSinceLast !== Infinity){
      if (effectiveCadence > this.cadence){
        this._cadence -= CADENCE_DELTA
        this.updateInterval(this._cadence)
      }
      else if (effectiveCadence < this.cadence){
        this._cadence += CADENCE_DELTA
        this.updateInterval(this._cadence);
      }
    }

    /**
     * Pedal event.
     * @event Simulation#pedal
     * @type {number} timestamp - timestamp (ms) of this pedal event
     */
    this.emit('pedal', this._lastPedalTime);
  }

  /**
   * Schedule the next pedal event according to the target cadence.
   * @private
   */
  schedulePedal() {
    if (this._interval === Infinity) return;
    this._timeoutId = setInterval(() => {
      this.onPedal();
    }, this._interval);
  }
}
