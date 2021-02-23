const defaults = {
  logFunction: console.log,
  level: 'info',
  levels: ['debug', 'info', 'warning', 'error'],
};

/**
 * Timestamped logger.
 */
export class Logger {
  constructor(options = {}) {
    const {logFunction, level, levels} = {...defaults, ...options};

    const levelIndex = levels.indexOf(level);
    if (levelIndex < 0) {
      throw new Error(`unrecognized log level "${level}"`);
    }

    const log = (...args) => logFunction(this.prefix, ...args);
    const doNotLog = () => {};

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
