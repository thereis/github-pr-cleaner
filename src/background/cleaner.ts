import type { MessageHandlerMap } from './types';

const STORAGE_KEY = 'enabled';
const PR_URL_PATTERN = 'https://github.com/*/pull/*';

const broadcastToTabs = (enabled: boolean) => {
  chrome.tabs.query({ url: PR_URL_PATTERN }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'toggle', enabled });
    }
  });
};

const onInstall = () => {
  chrome.storage.local.set({ [STORAGE_KEY]: true });
};

const handlers: MessageHandlerMap = {
  'get-state': (_message, _sender, sendResponse) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      sendResponse({ enabled: result[STORAGE_KEY] ?? true });
    });
    return true;
  },

  toggle: (_message, _sender, sendResponse) => {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const enabled = !(result[STORAGE_KEY] ?? true);
      chrome.storage.local.set({ [STORAGE_KEY]: enabled }, () => {
        broadcastToTabs(enabled);
        sendResponse({ enabled });
      });
    });
    return true;
  },
};

export { handlers, onInstall };
