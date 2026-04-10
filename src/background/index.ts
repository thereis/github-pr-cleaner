import type { MessageHandlerMap } from './types';
import { handlers as cleanerHandlers, onInstall as cleanerOnInstall } from './cleaner';
import { handlers as commentsHandlers, onInstall as commentsOnInstall } from './comments';
import { logger } from '../logger';

const features: { handlers: MessageHandlerMap; onInstall?: () => void }[] = [
  { handlers: cleanerHandlers, onInstall: cleanerOnInstall },
  { handlers: commentsHandlers, onInstall: commentsOnInstall },
];

const allHandlers = Object.assign({}, ...features.map((f) => f.handlers)) as MessageHandlerMap;

chrome.runtime.onInstalled.addListener(() => {
  for (const feature of features) {
    feature.onInstall?.();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handler = allHandlers[message.type as string];
  if (handler) return handler(message, sender, sendResponse);
});

const PR_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/;

const ensureContentScript = (tabId: number) => {
  chrome.tabs.sendMessage(tabId, { type: 'ping' }, (response) => {
    if (chrome.runtime.lastError || !response) {
      logger.debug('bg: content script not running, injecting into tab', tabId);
      chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] });
    } else {
      logger.debug('bg: content script alive, sending navigate signal');
      chrome.tabs.sendMessage(tabId, { type: 'spa-navigate' });
    }
  });
};

chrome.webNavigation.onHistoryStateUpdated.addListener(
  (details) => {
    if (details.frameId !== 0) return;
    if (PR_URL_RE.test(details.url)) {
      logger.debug('bg: SPA navigation to PR', details.url);
      ensureContentScript(details.tabId);
    }
  },
  { url: [{ hostEquals: 'github.com' }] },
);
