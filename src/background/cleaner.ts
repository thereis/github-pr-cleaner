import type { MessageHandlerMap } from './types';
import { PR_URL_MATCH_PATTERN, STORAGE_KEYS } from '../constants';

const broadcastToTabs = (enabled: boolean) => {
  chrome.tabs.query({ url: PR_URL_MATCH_PATTERN }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'toggle', enabled });
    }
  });
};

const onInstall = () => {
  chrome.storage.local.set({ [STORAGE_KEYS.deployEnabled]: true });
};

const handlers: MessageHandlerMap = {
  'get-state': (_message, _sender, sendResponse) => {
    chrome.storage.local.get(STORAGE_KEYS.deployEnabled, (result) => {
      sendResponse({ enabled: result[STORAGE_KEYS.deployEnabled] ?? true });
    });
    return true;
  },

  toggle: (_message, _sender, sendResponse) => {
    chrome.storage.local.get(STORAGE_KEYS.deployEnabled, (result) => {
      const enabled = !(result[STORAGE_KEYS.deployEnabled] ?? true);
      chrome.storage.local.set({ [STORAGE_KEYS.deployEnabled]: enabled }, () => {
        broadcastToTabs(enabled);
        sendResponse({ enabled });
      });
    });
    return true;
  },
};

export { handlers, onInstall };
