import {EventEmitter} from 'events';

/**
 * Emit wheel rotation events at a rate that matches the given target speed.
 * The target speed can be updated on-the-fly.
 */

const TIRE_CIRCUMFERENCE = 2.096; // in meter; Corresponds to 700x23C tire

export class WheelSimulation extends EventEmitter {
  constructor() {
    super();
    this._speed = 0;
    this._interval = Infinity;
    this._lastWheelTime = -Infinity;
    this._timeoutId = null;
  }

  /**
   * Set the target speed.
   * @param {number} speed - the target cadence in kmh.
   */
  set speed(x) {
    this._speed = x;
    this._interval = x > 0 ? ( ( 1000 * 18 * TIRE_CIRCUMFERENCE ) / ( 5 * this._speed) ) : Infinity;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
    this.scheduleWheel();
  }

  /**
   * Get the current target speed (km/h).
   */
  get speed() {
    return this._speed;
  }

  /**
   * Handle a wheel event.
   * @emits Simulation#wheel
   * @private
   */
  onWheel(timestamp) {
    this._lastWheelTime = Number.isFinite(timestamp) ? timestamp : Date.now();
    /**
     * Wheel event.
     * @event Simulation#wheel
     * @type {number} timestamp - timestamp (ms) of this wheel event
     */
    this.emit('wheel', this._lastWheelTime);
  }

  /**
   * Schedule the next wheel event according to the target speed.
   * @private
   */
  scheduleWheel() {
    if (this._interval === Infinity) return;

    let now = Date.now();
    let timeSinceLast = now - this._lastWheelTime;
    let timeUntilNext = Math.max(0, this._interval - timeSinceLast);
    let nextWheelTime = now + timeUntilNext;
    this._timeoutId = setTimeout(() => {
      this.onWheel(nextWheelTime);
      this.scheduleWheel();
    }, timeUntilNext);
  }
}
