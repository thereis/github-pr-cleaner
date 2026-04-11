import type { MessageHandlerMap } from './types';
import type { TextPattern } from '../constants';
import { logger } from '../logger';
import { PR_URL_MATCH_PATTERN, STORAGE_KEYS } from '../constants';

type State = {
  enabled: boolean;
  globalTextPatterns: TextPattern[];
  perPrTextPatterns: Record<string, TextPattern[]>;
};

const samePattern = (a: TextPattern, b: TextPattern): boolean =>
  a.pattern === b.pattern && a.regex === b.regex;

const getState = (callback: (state: State) => void) => {
  chrome.storage.local.get(
    [
      STORAGE_KEYS.textPatternsEnabled,
      STORAGE_KEYS.globalTextPatterns,
      STORAGE_KEYS.perPrTextPatterns,
    ],
    (result: Record<string, unknown>) => {
      const state: State = {
        enabled: (result[STORAGE_KEYS.textPatternsEnabled] as boolean) ?? false,
        globalTextPatterns: (result[STORAGE_KEYS.globalTextPatterns] as TextPattern[]) ?? [],
        perPrTextPatterns:
          (result[STORAGE_KEYS.perPrTextPatterns] as Record<string, TextPattern[]>) ?? {},
      };
      logger.debug('bg:text getState', state);
      callback(state);
    },
  );
};

const broadcastState = () => {
  getState((state) => {
    chrome.tabs.query({ url: PR_URL_MATCH_PATTERN }, (tabs) => {
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'text-updated', ...state });
        }
      }
    });
  });
};

const onInstall = () => {
  chrome.storage.local.get(
    [
      STORAGE_KEYS.textPatternsEnabled,
      STORAGE_KEYS.globalTextPatterns,
      STORAGE_KEYS.perPrTextPatterns,
    ],
    (result: Record<string, unknown>) => {
      const defaults: Record<string, unknown> = {};
      if (result[STORAGE_KEYS.textPatternsEnabled] === undefined)
        defaults[STORAGE_KEYS.textPatternsEnabled] = false;
      if (result[STORAGE_KEYS.globalTextPatterns] === undefined)
        defaults[STORAGE_KEYS.globalTextPatterns] = [];
      if (result[STORAGE_KEYS.perPrTextPatterns] === undefined)
        defaults[STORAGE_KEYS.perPrTextPatterns] = {};
      if (Object.keys(defaults).length > 0) chrome.storage.local.set(defaults);
    },
  );
};

const handlers: MessageHandlerMap = {
  'get-text-state': (_message, _sender, sendResponse) => {
    logger.debug('bg:text handling get-text-state');
    getState((state) => sendResponse(state));
    return true;
  },

  'toggle-text': (_message, _sender, sendResponse) => {
    logger.debug('bg:text handling toggle-text');
    chrome.storage.local.get(
      STORAGE_KEYS.textPatternsEnabled,
      (result: Record<string, unknown>) => {
        const enabled = !((result[STORAGE_KEYS.textPatternsEnabled] as boolean) ?? false);
        chrome.storage.local.set({ [STORAGE_KEYS.textPatternsEnabled]: enabled }, () => {
          broadcastState();
          sendResponse({ enabled });
        });
      },
    );
    return true;
  },

  'add-text-pattern': (message, _sender, sendResponse) => {
    const { pattern, regex, prPath } = message as {
      pattern: string;
      regex: boolean;
      prPath: string;
    };
    const entry: TextPattern = { pattern, regex };
    chrome.storage.local.get(STORAGE_KEYS.perPrTextPatterns, (result: Record<string, unknown>) => {
      const perPr: Record<string, TextPattern[]> =
        (result[STORAGE_KEYS.perPrTextPatterns] as Record<string, TextPattern[]>) ?? {};
      const list = perPr[prPath] ?? [];
      if (!list.some((p) => samePattern(p, entry))) list.push(entry);
      perPr[prPath] = list;
      chrome.storage.local.set({ [STORAGE_KEYS.perPrTextPatterns]: perPr }, () => {
        broadcastState();
        sendResponse({ perPrTextPatterns: perPr });
      });
    });
    return true;
  },

  'remove-text-pattern': (message, _sender, sendResponse) => {
    const { pattern, regex, prPath } = message as {
      pattern: string;
      regex: boolean;
      prPath: string;
    };
    const entry: TextPattern = { pattern, regex };
    chrome.storage.local.get(STORAGE_KEYS.perPrTextPatterns, (result: Record<string, unknown>) => {
      const perPr: Record<string, TextPattern[]> =
        (result[STORAGE_KEYS.perPrTextPatterns] as Record<string, TextPattern[]>) ?? {};
      perPr[prPath] = (perPr[prPath] ?? []).filter((p) => !samePattern(p, entry));
      if (perPr[prPath].length === 0) delete perPr[prPath];
      chrome.storage.local.set({ [STORAGE_KEYS.perPrTextPatterns]: perPr }, () => {
        broadcastState();
        sendResponse({ perPrTextPatterns: perPr });
      });
    });
    return true;
  },

  'add-text-pattern-global': (message, _sender, sendResponse) => {
    const { pattern, regex } = message as { pattern: string; regex: boolean };
    const entry: TextPattern = { pattern, regex };
    chrome.storage.local.get(STORAGE_KEYS.globalTextPatterns, (result: Record<string, unknown>) => {
      const list: TextPattern[] = (result[STORAGE_KEYS.globalTextPatterns] as TextPattern[]) ?? [];
      if (!list.some((p) => samePattern(p, entry))) list.push(entry);
      chrome.storage.local.set({ [STORAGE_KEYS.globalTextPatterns]: list }, () => {
        broadcastState();
        sendResponse({ globalTextPatterns: list });
      });
    });
    return true;
  },

  'remove-text-pattern-global': (message, _sender, sendResponse) => {
    const { pattern, regex } = message as { pattern: string; regex: boolean };
    const entry: TextPattern = { pattern, regex };
    chrome.storage.local.get(STORAGE_KEYS.globalTextPatterns, (result: Record<string, unknown>) => {
      const list: TextPattern[] = (
        (result[STORAGE_KEYS.globalTextPatterns] as TextPattern[]) ?? []
      ).filter((p) => !samePattern(p, entry));
      chrome.storage.local.set({ [STORAGE_KEYS.globalTextPatterns]: list }, () => {
        broadcastState();
        sendResponse({ globalTextPatterns: list });
      });
    });
    return true;
  },
};

export { handlers, onInstall };
