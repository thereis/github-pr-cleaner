import log from 'loglevel';
import { STORAGE_KEYS } from './constants';

const PREFIX = '[PR-Cleaner]';

log.setLevel('error');

const initLogger = (): Promise<void> =>
  new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.debugLogsEnabled, (result) => {
      const enabled = result[STORAGE_KEYS.debugLogsEnabled] === true;
      log.setLevel(enabled ? 'debug' : 'error');
      resolve();
    });
  });

const logger = {
  debug: (...args: unknown[]) => log.debug(PREFIX, ...args),
  info: (...args: unknown[]) => log.info(PREFIX, ...args),
  warn: (...args: unknown[]) => log.warn(PREFIX, ...args),
  error: (...args: unknown[]) => log.error(PREFIX, ...args),
};

export { logger, initLogger };
