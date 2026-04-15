import type { MessageHandlerMap } from './types';
import { PR_URL_MATCH_PATTERN, STORAGE_KEYS } from '../constants';

const broadcastToTabs = (enabled: boolean) => {
  chrome.tabs.query({ url: PR_URL_MATCH_PATTERN }, (tabs) => {
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'workflows-updated', enabled });
    }
  });
};

const onInstall = () => {
  chrome.storage.local.set({ [STORAGE_KEYS.workflowsPanelEnabled]: false });
};

const handlers: MessageHandlerMap = {
  'get-workflows-state': (_message, _sender, sendResponse) => {
    chrome.storage.local.get(STORAGE_KEYS.workflowsPanelEnabled, (result) => {
      sendResponse({ enabled: result[STORAGE_KEYS.workflowsPanelEnabled] ?? false });
    });
    return true;
  },

  'toggle-workflows': (_message, _sender, sendResponse) => {
    chrome.storage.local.get(STORAGE_KEYS.workflowsPanelEnabled, (result) => {
      const enabled = !(result[STORAGE_KEYS.workflowsPanelEnabled] ?? false);
      chrome.storage.local.set({ [STORAGE_KEYS.workflowsPanelEnabled]: enabled }, () => {
        broadcastToTabs(enabled);
        sendResponse({ enabled });
      });
    });
    return true;
  },
};

export { handlers, onInstall };
