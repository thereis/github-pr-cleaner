import {
  hideDeployItems,
  showDeployItems,
  expandHiddenItems,
  getHiddenCount,
  resetDeploy,
} from './deploy';
import {
  getPrUsers,
  hideUserComments,
  showAllComments,
  getSilencedUsers,
  resetComments,
} from './comments';
import { updateChip, hideChip } from './chip';
import { logger } from '../logger';
import { PR_CONVERSATION_PATH_RE, PR_PATH_RE, TIMELINE_ITEM_SELECTOR } from '../constants';

let currentUrl = location.href;
let timelineObserver: MutationObserver | null = null;
let deployEnabled = true;
let commentsEnabled = false;
let globalHiddenUsers: string[] = [];
let perPrHiddenUsers: Record<string, string[]> = {};

const isPRConversationPage = () => PR_CONVERSATION_PATH_RE.test(location.pathname);

const getPrPath = () => {
  const match = location.pathname.match(PR_PATH_RE);
  return match?.[0] ?? '';
};

const getEffectiveHiddenUsers = (): string[] => {
  const prPath = getPrPath();
  const perPr = perPrHiddenUsers[prPath] ?? [];
  const merged = new Set([...globalHiddenUsers, ...perPr]);
  return Array.from(merged);
};

const refreshChip = () => {
  updateChip({
    deployCount: deployEnabled ? getHiddenCount() : 0,
    silencedUsers: commentsEnabled ? getSilencedUsers() : new Map(),
  });
};

const runDeploy = () => {
  if (!deployEnabled) return;
  expandHiddenItems();
  hideDeployItems();
};

const runComments = () => {
  if (!commentsEnabled) {
    showAllComments();
    return;
  }
  const hidden = getEffectiveHiddenUsers();
  hideUserComments(hidden);
};

const run = () => {
  runDeploy();
  runComments();
  refreshChip();
};

const observeTimeline = () => {
  if (timelineObserver) timelineObserver.disconnect();

  const timeline =
    document.querySelector('.js-discussion-timeline-container') ||
    document.querySelector('.pull-discussion-timeline') ||
    document.body;

  timelineObserver = new MutationObserver((mutations) => {
    let shouldRun = false;

    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;

        if (el.matches?.(TIMELINE_ITEM_SELECTOR)) {
          shouldRun = true;
          break;
        }

        if (el.querySelector?.('.TimelineItem, button.ajax-pagination-btn')) {
          shouldRun = true;
          break;
        }
      }
      if (shouldRun) break;
    }

    if (shouldRun) run();
  });

  timelineObserver.observe(timeline, { childList: true, subtree: true });
};

const reset = () => {
  resetDeploy();
  resetComments();
  if (timelineObserver) {
    timelineObserver.disconnect();
    timelineObserver = null;
  }
};

const onPageChange = () => {
  if (location.href === currentUrl) return;
  currentUrl = location.href;
  reset();

  if (isPRConversationPage()) {
    run();
    observeTimeline();
  } else {
    hideChip();
  }
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  logger.debug('content received message', message.type, message);

  if (message.type === 'ping') {
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'spa-navigate') {
    logger.debug('content spa-navigate, forcing page change check');
    currentUrl = '';
    onPageChange();
    return;
  }

  if (message.type === 'get-pr-users') {
    const result = getPrUsers();
    logger.debug('content get-pr-users response', result);
    sendResponse(result);
    return true;
  }

  if (message.type === 'toggle') {
    deployEnabled = message.enabled;
    if (deployEnabled && isPRConversationPage()) {
      runDeploy();
      observeTimeline();
    } else {
      showDeployItems();
    }
    refreshChip();
    return;
  }

  if (message.type === 'comments-updated') {
    commentsEnabled = message.enabled;
    globalHiddenUsers = message.globalHiddenUsers;
    perPrHiddenUsers = message.perPrHiddenUsers;
    runComments();
    refreshChip();
    return;
  }
});

logger.info('content script loaded', { url: location.href, isPR: isPRConversationPage() });

chrome.runtime.sendMessage({ type: 'get-state' }, (response) => {
  logger.debug('content get-state response', response);
  deployEnabled = response.enabled;

  if (deployEnabled && isPRConversationPage()) {
    runDeploy();
    observeTimeline();
  }
  refreshChip();
});

chrome.runtime.sendMessage({ type: 'get-comments-state' }, (response) => {
  logger.debug('content get-comments-state response', response);
  commentsEnabled = response.enabled;
  globalHiddenUsers = response.globalHiddenUsers;
  perPrHiddenUsers = response.perPrHiddenUsers;

  if (commentsEnabled && isPRConversationPage()) {
    runComments();
  }
  refreshChip();
});

if (isPRConversationPage()) {
  run();
  observeTimeline();
}

const navigationObserver = new MutationObserver(onPageChange);
navigationObserver.observe(document.body, { childList: true, subtree: true });
document.addEventListener('turbo:load', onPageChange);
