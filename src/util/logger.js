/**
 * Timestamped logger.
 */
export class Logger {
  constructor(cons = console) {
    this._cons = cons;
  }

  log(...args) {
    return this._cons.log(this.prefix, ...args);
  }

  error(...args) {
    return this._cons.error(this.prefix, ...args);
  }

  get prefix() {
    const time = new Date().toISOString();
    return `[${time}]`;
  }
}
