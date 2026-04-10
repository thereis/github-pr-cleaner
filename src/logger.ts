import log from 'loglevel';

const PREFIX = '[PR-Cleaner]';

log.setLevel('debug');

const logger = {
  debug: (...args: unknown[]) => log.debug(PREFIX, ...args),
  info: (...args: unknown[]) => log.info(PREFIX, ...args),
  warn: (...args: unknown[]) => log.warn(PREFIX, ...args),
  error: (...args: unknown[]) => log.error(PREFIX, ...args),
};

export { logger };
