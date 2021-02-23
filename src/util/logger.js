const defaults = {
  logFunction: defaultLogFunction,
  level: 'info',
  levels: ['debug', 'info', 'warning', 'error'],
};

export class Logger {
  /**
   * Create a Logger instance.
   *
   * For each log level, a method of the same name is added to the instance.
   * The method calls logFunction if its level is greater than or equal to
   * the Logger's level. Otherwise it calls an empty no-op function.
   *
   * @param {object} options
   * @param {function} options.logFunction - callback that formats and writes the message
   * @param {string} options.level - log level (messages below this level are not logged)
   * @param {string[]} options.levels - log levels
   */
  constructor(options = {}) {
    const {logFunction, level, levels} = {...defaults, ...options};

    const levelIndex = levels.indexOf(level);
    if (levelIndex < 0) {
      throw new Error(`unrecognized log level "${level}"`);
    }

    // Attach a method for each log level
    const noop = () => {};
    levels.forEach((l, i) => {
      this[l] = levelIndex <= i ? logFunction.bind(this, l) : noop;
    });
  }
}

export function getDefaultLogLevels() {
  return defaults.levels;
}

/**
 * Default log function. Prepends a timestamp to each log line.
 * @param {string} level - message level
 * @param {...} - message
 */
function defaultLogFunction(level, ...args) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}]`, ...args);
}
