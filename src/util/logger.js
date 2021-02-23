const defaults = {
  logFunction: console.log,
  level: 'info',
  levels: ['debug', 'info', 'warning', 'error'],
};

/**
 * Timestamped logger.
 */
export class Logger {
  /**
   * Create a Logger instance.
   *
   * For each log level, a method of the same name is added to the instance.
   * The method calls logFunction if its level is greater than or equal to
   * the Logger's level. Otherwise it calls an empty no-op function.
   *
   * @param {object} options
   * @param {function} options.logFunction - defaults to console.log
   * @param {string} options.level - log level (msgs below this level are not logged)
   * @param {string[]} options.levels - log levels
   */
  constructor(options = {}) {
    const {logFunction, level, levels} = {...defaults, ...options};

    const levelIndex = levels.indexOf(level);
    if (levelIndex < 0) {
      throw new Error(`unrecognized log level "${level}"`);
    }

    const log = (...args) => logFunction(this.prefix, ...args);
    const doNotLog = () => {};

    // Attach the appropriate method for each log level
    levels.forEach((l, i) => {
      this[l] = levelIndex <= i ? log : doNotLog;
    });
  }

  get prefix() {
    const time = new Date().toISOString();
    return `[${time}]`;
  }
}

export function getDefaultLogLevels() {
  return defaults.levels;
}
