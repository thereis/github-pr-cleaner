import { logger } from './logger';

const deployToggle = document.getElementById('deploy-toggle') as HTMLInputElement;
const deployLabel = document.getElementById('deploy-status') as HTMLSpanElement;
const commentsToggle = document.getElementById('comments-toggle') as HTMLInputElement;
const commentsLabel = document.getElementById('comments-status') as HTMLSpanElement;
const userListContainer = document.getElementById('user-list-container') as HTMLDivElement;
const reloadBanner = document.getElementById('reload-banner') as HTMLDivElement;
const reloadBtn = document.getElementById('reload-btn') as HTMLButtonElement;
let needsReload = false;

let currentPrPath = '';
let commentsState: {
  enabled: boolean;
  globalHiddenUsers: string[];
  perPrHiddenUsers: Record<string, string[]>;
} = { enabled: false, globalHiddenUsers: [], perPrHiddenUsers: {} };
let prUsers: string[] = [];

const updateDeployUI = (enabled: boolean) => {
  deployToggle.checked = enabled;
  deployLabel.textContent = enabled ? 'On' : 'Off';
};

const updateCommentsUI = () => {
  commentsToggle.checked = commentsState.enabled;
  commentsLabel.textContent = commentsState.enabled ? 'On' : 'Off';
  userListContainer.style.display = commentsState.enabled ? 'block' : 'none';
  renderUserList();
};

const isUserHidden = (username: string): boolean => {
  const perPr = commentsState.perPrHiddenUsers[currentPrPath] ?? [];
  return commentsState.globalHiddenUsers.includes(username) || perPr.includes(username);
};

const isUserGlobal = (username: string): boolean => {
  return commentsState.globalHiddenUsers.includes(username);
};

const renderUserList = () => {
  if (!commentsState.enabled) {
    userListContainer.innerHTML = '';
    return;
  }

  if (prUsers.length === 0) {
    userListContainer.innerHTML = '<div class="empty-msg">No participants found</div>';
    return;
  }

  userListContainer.innerHTML = prUsers
    .map((user) => {
      const hidden = isUserHidden(user);
      const global = isUserGlobal(user);
      return `
        <div class="user-row" data-username="${user}">
          <label>
            <input type="checkbox" class="user-check" ${hidden ? 'checked' : ''} />
            <span class="username">@${user}</span>
          </label>
          <button class="globe-btn ${global ? 'active' : ''}" title="Toggle global">🌐</button>
        </div>
      `;
    })
    .join('');

  userListContainer.querySelectorAll('.user-row').forEach((row) => {
    const username = (row as HTMLElement).dataset.username!;
    const check = row.querySelector('.user-check') as HTMLInputElement;
    const globe = row.querySelector('.globe-btn') as HTMLButtonElement;

    check.addEventListener('change', () => {
      const unmuting = !check.checked;
      const type = check.checked ? 'hide-user' : 'unhide-user';
      chrome.runtime.sendMessage({ type, username, prPath: currentPrPath }, (response) => {
        commentsState.perPrHiddenUsers = response.perPrHiddenUsers;
        if (unmuting) showReloadBanner();
        renderUserList();
      });
    });

    globe.addEventListener('click', () => {
      const wasGlobal = isUserGlobal(username);
      const type = wasGlobal ? 'unhide-user-global' : 'hide-user-global';
      chrome.runtime.sendMessage({ type, username }, (response) => {
        commentsState.globalHiddenUsers = response.globalHiddenUsers;
        if (wasGlobal) showReloadBanner();
        renderUserList();
      });
    });
  });
};

const showReloadBanner = () => {
  needsReload = true;
  reloadBanner.style.display = 'block';
};

reloadBtn.addEventListener('click', () => {
  if (activeTabId) {
    chrome.tabs.reload(activeTabId);
    needsReload = false;
    reloadBanner.style.display = 'none';
  }
});

let activeTabId: number | null = null;

const getActiveTab = (callback: (tab: chrome.tabs.Tab) => void) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    logger.debug('popup tabs.query result', tabs.length, tabs[0]?.url);
    if (tabs[0]) callback(tabs[0]);
    else logger.warn('popup: no active tab found');
  });
};

const fetchPrUsers = (callback?: () => void) => {
  logger.debug('popup fetchPrUsers', { activeTabId });
  if (!activeTabId) {
    logger.warn('popup fetchPrUsers: no active tab');
    prUsers = [];
    callback?.();
    return;
  }

  chrome.tabs.sendMessage(activeTabId, { type: 'get-pr-users' }, (usersResponse) => {
    if (chrome.runtime.lastError) {
      logger.error('popup fetchPrUsers error', chrome.runtime.lastError.message);
      prUsers = [];
    } else if (!usersResponse) {
      logger.warn('popup fetchPrUsers: empty response');
      prUsers = [];
    } else {
      logger.debug('popup fetchPrUsers result', usersResponse);
      prUsers = usersResponse.users ?? [];
    }
    callback?.();
  });
};

chrome.storage.local.get(
  ['enabled', 'commentsEnabled', 'globalHiddenUsers', 'perPrHiddenUsers'],
  (result: Record<string, unknown>) => {
    logger.debug('popup storage read', result);

    updateDeployUI((result.enabled as boolean) ?? true);

    commentsState = {
      enabled: (result.commentsEnabled as boolean) ?? false,
      globalHiddenUsers: (result.globalHiddenUsers as string[]) ?? [],
      perPrHiddenUsers: (result.perPrHiddenUsers as Record<string, string[]>) ?? {},
    };
    updateCommentsUI();

    getActiveTab((tab) => {
      logger.debug('popup active tab', { id: tab.id, url: tab.url });
      if (!tab.id || !tab.url) return;

      activeTabId = tab.id;
      const url = new URL(tab.url);
      const match = url.pathname.match(/^\/[^/]+\/[^/]+\/pull\/\d+/);
      currentPrPath = match?.[0] ?? '';
      logger.debug('popup prPath', currentPrPath);

      fetchPrUsers(() => {
        logger.debug('popup users loaded', prUsers);
        updateCommentsUI();
      });
    });
  },
);

deployToggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'toggle' }, (response) => {
    updateDeployUI(response.enabled);
  });
});

commentsToggle.addEventListener('change', () => {
  logger.debug('popup toggle-comments clicked');
  chrome.runtime.sendMessage({ type: 'toggle-comments' }, (response) => {
    logger.debug('popup toggle-comments response', response);
    commentsState.enabled = response.enabled;
    fetchPrUsers(() => updateCommentsUI());
  });
});
