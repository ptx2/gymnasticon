import {EventEmitter} from 'events';

/**
 * Emit an event after the specified time interval. One-shot or repeated.
 */
export class Timer extends EventEmitter {
  /**
   * Create a Timer instance.
   * @param {number} interval - time until expires in seconds
   * @param {object} options
   * @param {boolean} [options.repeats=true] - restart the timer each time it expires
   */
  constructor(interval, { repeats = true }={}) {
    super();
    this._interval = interval;
    this._repeats = repeats;
    this._timeout = null;
    this.onExpire = this.onExpire.bind(this);
  }

  /**
   * Get the current interval (seconds).
   */
  get interval() {
    return this._interval;
  }

  /**
   * Reset the timer.
   */
  reset() {
    this.clearTimeout();
    this._timeout = Number.isFinite(this._interval) && this._interval > 0 ? setTimeout(this.onExpire, this._interval*1000) : null;
  }

  /**
   * Cancel the timer.
   */
  cancel() {
    this.clearTimeout();
  }

  /**
   * Handle timer expiry.
   * @emits Timer#timeout
   * @private
   */
  onExpire() {
    /**
     * Timeout event.
     * @event Timer#timeout
     */
    this.emit('timeout', this._interval);
    if (this._repeats) {
      this.reset();
    }
  }

  /**
   * Clear internal timer.
   * @private
   */
  clearTimeout() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }
}
