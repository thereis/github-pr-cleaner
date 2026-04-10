import type { MessageHandlerMap } from './types';
import { logger } from '../logger';

const STORAGE_KEYS = {
  enabled: 'commentsEnabled',
  global: 'globalHiddenUsers',
  perPr: 'perPrHiddenUsers',
};

const PR_URL_PATTERN = 'https://github.com/*/pull/*';

const getState = (
  callback: (state: {
    enabled: boolean;
    globalHiddenUsers: string[];
    perPrHiddenUsers: Record<string, string[]>;
  }) => void,
) => {
  chrome.storage.local.get(
    [STORAGE_KEYS.enabled, STORAGE_KEYS.global, STORAGE_KEYS.perPr],
    (result: Record<string, unknown>) => {
      const state = {
        enabled: (result[STORAGE_KEYS.enabled] as boolean) ?? false,
        globalHiddenUsers: (result[STORAGE_KEYS.global] as string[]) ?? [],
        perPrHiddenUsers: (result[STORAGE_KEYS.perPr] as Record<string, string[]>) ?? {},
      };
      logger.debug('bg:comments getState', state);
      callback(state);
    },
  );
};

const broadcastState = () => {
  getState((state) => {
    chrome.tabs.query({ url: PR_URL_PATTERN }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'comments-updated', ...state });
        }
      }
    });
  });
};

const onInstall = () => {
  chrome.storage.local.get(
    [STORAGE_KEYS.enabled, STORAGE_KEYS.global, STORAGE_KEYS.perPr],
    (result: Record<string, unknown>) => {
      const defaults: Record<string, unknown> = {};
      if (result[STORAGE_KEYS.enabled] === undefined) defaults[STORAGE_KEYS.enabled] = false;
      if (result[STORAGE_KEYS.global] === undefined) defaults[STORAGE_KEYS.global] = [];
      if (result[STORAGE_KEYS.perPr] === undefined) defaults[STORAGE_KEYS.perPr] = {};
      if (Object.keys(defaults).length > 0) chrome.storage.local.set(defaults);
    },
  );
};

const handlers: MessageHandlerMap = {
  'get-comments-state': (_message, _sender, sendResponse) => {
    logger.debug('bg:comments handling get-comments-state');
    getState((state) => sendResponse(state));
    return true;
  },

  'toggle-comments': (_message, _sender, sendResponse) => {
    logger.debug('bg:comments handling toggle-comments');
    chrome.storage.local.get(STORAGE_KEYS.enabled, (result: Record<string, unknown>) => {
      const enabled = !((result[STORAGE_KEYS.enabled] as boolean) ?? false);
      logger.debug('bg:comments toggled to', enabled);
      chrome.storage.local.set({ [STORAGE_KEYS.enabled]: enabled }, () => {
        broadcastState();
        sendResponse({ enabled });
      });
    });
    return true;
  },

  'hide-user': (message, _sender, sendResponse) => {
    const { username, prPath } = message as { username: string; prPath: string };
    chrome.storage.local.get(STORAGE_KEYS.perPr, (result: Record<string, unknown>) => {
      const perPr: Record<string, string[]> =
        (result[STORAGE_KEYS.perPr] as Record<string, string[]>) ?? {};
      const list = perPr[prPath] ?? [];
      if (!list.includes(username)) list.push(username);
      perPr[prPath] = list;
      chrome.storage.local.set({ [STORAGE_KEYS.perPr]: perPr }, () => {
        broadcastState();
        sendResponse({ perPrHiddenUsers: perPr });
      });
    });
    return true;
  },

  'unhide-user': (message, _sender, sendResponse) => {
    const { username, prPath } = message as { username: string; prPath: string };
    chrome.storage.local.get(STORAGE_KEYS.perPr, (result: Record<string, unknown>) => {
      const perPr: Record<string, string[]> =
        (result[STORAGE_KEYS.perPr] as Record<string, string[]>) ?? {};
      perPr[prPath] = (perPr[prPath] ?? []).filter((u) => u !== username);
      if (perPr[prPath].length === 0) delete perPr[prPath];
      chrome.storage.local.set({ [STORAGE_KEYS.perPr]: perPr }, () => {
        broadcastState();
        sendResponse({ perPrHiddenUsers: perPr });
      });
    });
    return true;
  },

  'hide-user-global': (message, _sender, sendResponse) => {
    const { username } = message as { username: string };
    chrome.storage.local.get(STORAGE_KEYS.global, (result: Record<string, unknown>) => {
      const list: string[] = (result[STORAGE_KEYS.global] as string[]) ?? [];
      if (!list.includes(username)) list.push(username);
      chrome.storage.local.set({ [STORAGE_KEYS.global]: list }, () => {
        broadcastState();
        sendResponse({ globalHiddenUsers: list });
      });
    });
    return true;
  },

  'unhide-user-global': (message, _sender, sendResponse) => {
    const { username } = message as { username: string };
    chrome.storage.local.get(STORAGE_KEYS.global, (result: Record<string, unknown>) => {
      const list: string[] = ((result[STORAGE_KEYS.global] as string[]) ?? []).filter(
        (u: string) => u !== username,
      );
      chrome.storage.local.set({ [STORAGE_KEYS.global]: list }, () => {
        broadcastState();
        sendResponse({ globalHiddenUsers: list });
      });
    });
    return true;
  },
};

export { handlers, onInstall };
