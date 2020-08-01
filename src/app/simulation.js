import {EventEmitter} from 'events';

/**
 * Emit pedal stroke events at a rate that matches the given target cadence.
 * The target cadence can be updated on-the-fly.
 */
export class Simulation extends EventEmitter {
  constructor() {
    super();
    this._cadence = 0;
    this._interval = Infinity;
    this._lastPedalTime = -Infinity;
    this._timeoutId = null;
  }

  /**
   * Set the target cadence.
   * @param {number} cadence - the target cadence in rpm.
   */
  set cadence(x) {
    this._cadence = x;
    this._interval = x > 0 ? 1000 * (60 / this._cadence) : Infinity;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this.schedulePedal();
  }

  /**
   * Get the current target cadence (rpm).
   */
  get cadence() {
    return this._cadence;
  }

  /**
   * Handle a pedal event.
   * @emits Simulation#pedal
   * @private
   */
  onPedal() {
    this._lastPedalTime = Date.now();
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

    let timeSinceLast = Date.now() - this._lastPedalTime;
    let timeUntilNext = Math.max(0, this._interval - timeSinceLast);
    this._timeoutId = setTimeout(() => {
      this.onPedal();
      this.schedulePedal();
    }, timeUntilNext);
  }
}
