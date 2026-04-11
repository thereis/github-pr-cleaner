import type { MessageHandlerMap } from './types';
import { logger } from '../logger';
import { PR_URL_MATCH_PATTERN, STORAGE_KEYS } from '../constants';

const getState = (
  callback: (state: {
    enabled: boolean;
    globalHiddenUsers: string[];
    perPrHiddenUsers: Record<string, string[]>;
  }) => void,
) => {
  chrome.storage.local.get(
    [STORAGE_KEYS.commentsEnabled, STORAGE_KEYS.globalHiddenUsers, STORAGE_KEYS.perPrHiddenUsers],
    (result: Record<string, unknown>) => {
      const state = {
        enabled: (result[STORAGE_KEYS.commentsEnabled] as boolean) ?? false,
        globalHiddenUsers: (result[STORAGE_KEYS.globalHiddenUsers] as string[]) ?? [],
        perPrHiddenUsers: (result[STORAGE_KEYS.perPrHiddenUsers] as Record<string, string[]>) ?? {},
      };
      logger.debug('bg:comments getState', state);
      callback(state);
    },
  );
};

const broadcastState = () => {
  getState((state) => {
    chrome.tabs.query({ url: PR_URL_MATCH_PATTERN }, (tabs) => {
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
    [STORAGE_KEYS.commentsEnabled, STORAGE_KEYS.globalHiddenUsers, STORAGE_KEYS.perPrHiddenUsers],
    (result: Record<string, unknown>) => {
      const defaults: Record<string, unknown> = {};
      if (result[STORAGE_KEYS.commentsEnabled] === undefined)
        defaults[STORAGE_KEYS.commentsEnabled] = false;
      if (result[STORAGE_KEYS.globalHiddenUsers] === undefined)
        defaults[STORAGE_KEYS.globalHiddenUsers] = [];
      if (result[STORAGE_KEYS.perPrHiddenUsers] === undefined)
        defaults[STORAGE_KEYS.perPrHiddenUsers] = {};
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
    chrome.storage.local.get(STORAGE_KEYS.commentsEnabled, (result: Record<string, unknown>) => {
      const enabled = !((result[STORAGE_KEYS.commentsEnabled] as boolean) ?? false);
      logger.debug('bg:comments toggled to', enabled);
      chrome.storage.local.set({ [STORAGE_KEYS.commentsEnabled]: enabled }, () => {
        broadcastState();
        sendResponse({ enabled });
      });
    });
    return true;
  },

  'hide-user': (message, _sender, sendResponse) => {
    const { username, prPath } = message as { username: string; prPath: string };
    chrome.storage.local.get(STORAGE_KEYS.perPrHiddenUsers, (result: Record<string, unknown>) => {
      const perPr: Record<string, string[]> =
        (result[STORAGE_KEYS.perPrHiddenUsers] as Record<string, string[]>) ?? {};
      const list = perPr[prPath] ?? [];
      if (!list.includes(username)) list.push(username);
      perPr[prPath] = list;
      chrome.storage.local.set({ [STORAGE_KEYS.perPrHiddenUsers]: perPr }, () => {
        broadcastState();
        sendResponse({ perPrHiddenUsers: perPr });
      });
    });
    return true;
  },

  'unhide-user': (message, _sender, sendResponse) => {
    const { username, prPath } = message as { username: string; prPath: string };
    chrome.storage.local.get(STORAGE_KEYS.perPrHiddenUsers, (result: Record<string, unknown>) => {
      const perPr: Record<string, string[]> =
        (result[STORAGE_KEYS.perPrHiddenUsers] as Record<string, string[]>) ?? {};
      perPr[prPath] = (perPr[prPath] ?? []).filter((u) => u !== username);
      if (perPr[prPath].length === 0) delete perPr[prPath];
      chrome.storage.local.set({ [STORAGE_KEYS.perPrHiddenUsers]: perPr }, () => {
        broadcastState();
        sendResponse({ perPrHiddenUsers: perPr });
      });
    });
    return true;
  },

  'hide-user-global': (message, _sender, sendResponse) => {
    const { username } = message as { username: string };
    chrome.storage.local.get(STORAGE_KEYS.globalHiddenUsers, (result: Record<string, unknown>) => {
      const list: string[] = (result[STORAGE_KEYS.globalHiddenUsers] as string[]) ?? [];
      if (!list.includes(username)) list.push(username);
      chrome.storage.local.set({ [STORAGE_KEYS.globalHiddenUsers]: list }, () => {
        broadcastState();
        sendResponse({ globalHiddenUsers: list });
      });
    });
    return true;
  },

  'unhide-user-global': (message, _sender, sendResponse) => {
    const { username } = message as { username: string };
    chrome.storage.local.get(STORAGE_KEYS.globalHiddenUsers, (result: Record<string, unknown>) => {
      const list: string[] = ((result[STORAGE_KEYS.globalHiddenUsers] as string[]) ?? []).filter(
        (u: string) => u !== username,
      );
      chrome.storage.local.set({ [STORAGE_KEYS.globalHiddenUsers]: list }, () => {
        broadcastState();
        sendResponse({ globalHiddenUsers: list });
      });
    });
    return true;
  },
};

export { handlers, onInstall };
