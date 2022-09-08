import {EventEmitter} from 'events';

const debuglog = require('debug')('gym:sim:crank');

/**
 * Emit pedal stroke events at a rate that matches the given target cadence.
 * The target cadence can be updated on-the-fly.
 */
export class CrankSimulation extends EventEmitter {
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
  onPedal(timestamp) {
    this._lastPedalTime = Number.isFinite(timestamp) ? timestamp : Date.now();
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

    let now = Date.now();
    let timeSinceLast = now - this._lastPedalTime;
    let timeUntilNext = Math.max(0, this._interval - timeSinceLast);
    let nextPedalTime = now + timeUntilNext;
    debuglog(`Crank Simulation: Interval=${this._interval} Next interval=${timeSinceLast+timeUntilNext} sinceLast=${timeSinceLast} untilNext=${timeUntilNext}`);
    this._timeoutId = setTimeout(() => {
      this.onPedal(nextPedalTime);
      this.schedulePedal();
    }, timeUntilNext);
  }
}
