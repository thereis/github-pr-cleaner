import { logger } from './logger';
import { PR_PATH_RE, STORAGE_KEYS } from './constants';
import type { TextPattern } from './constants';

const deployToggle = document.getElementById('deploy-toggle') as HTMLInputElement;
const deployLabel = document.getElementById('deploy-status') as HTMLSpanElement;
const commentsToggle = document.getElementById('comments-toggle') as HTMLInputElement;
const commentsLabel = document.getElementById('comments-status') as HTMLSpanElement;
const userListContainer = document.getElementById('user-list-container') as HTMLDivElement;
const reloadBanner = document.getElementById('reload-banner') as HTMLDivElement;
const reloadBtn = document.getElementById('reload-btn') as HTMLButtonElement;
const textToggle = document.getElementById('text-toggle') as HTMLInputElement;
const textLabel = document.getElementById('text-status') as HTMLSpanElement;
const textContainer = document.getElementById('text-container') as HTMLDivElement;
const textInput = document.getElementById('text-input') as HTMLInputElement;
const textAddBtn = document.getElementById('text-add-btn') as HTMLButtonElement;
const textError = document.getElementById('text-error') as HTMLDivElement;
const textListContainer = document.getElementById('text-list-container') as HTMLDivElement;

let currentPrPath = '';
let commentsState: {
  enabled: boolean;
  globalHiddenUsers: string[];
  perPrHiddenUsers: Record<string, string[]>;
} = { enabled: false, globalHiddenUsers: [], perPrHiddenUsers: {} };
let prUsers: string[] = [];
let textState: {
  enabled: boolean;
  globalTextPatterns: TextPattern[];
  perPrTextPatterns: Record<string, TextPattern[]>;
} = { enabled: false, globalTextPatterns: [], perPrTextPatterns: {} };

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
  reloadBanner.style.display = 'block';
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const samePattern = (a: TextPattern, b: TextPattern): boolean =>
  a.pattern === b.pattern && a.regex === b.regex;

const isPatternGlobal = (entry: TextPattern): boolean =>
  textState.globalTextPatterns.some((p) => samePattern(p, entry));

const isPatternInCurrentPr = (entry: TextPattern): boolean => {
  const list = textState.perPrTextPatterns[currentPrPath] ?? [];
  return list.some((p) => samePattern(p, entry));
};

const updateTextUI = () => {
  textToggle.checked = textState.enabled;
  textLabel.textContent = textState.enabled ? 'On' : 'Off';
  textContainer.style.display = textState.enabled ? 'block' : 'none';
  renderTextList();
};

const orderedTextPatterns = (): TextPattern[] => {
  const perPr = textState.perPrTextPatterns[currentPrPath] ?? [];
  const seen = new Set<string>();
  const out: TextPattern[] = [];
  for (const p of textState.globalTextPatterns) {
    const key = `${p.regex ? 'r' : 's'}:${p.pattern}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  for (const p of perPr) {
    const key = `${p.regex ? 'r' : 's'}:${p.pattern}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
};

const showTextError = (msg: string) => {
  textError.textContent = msg;
  textError.style.display = 'block';
};

const clearTextError = () => {
  textError.textContent = '';
  textError.style.display = 'none';
};

const validateRegex = (pattern: string): string | null => {
  try {
    new RegExp(pattern, 'i');
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'invalid regex';
  }
};

const renderTextList = () => {
  if (!textState.enabled) {
    textListContainer.innerHTML = '';
    return;
  }

  const patterns = orderedTextPatterns();
  if (patterns.length === 0) {
    textListContainer.innerHTML = '<div class="empty-msg">No patterns added</div>';
    return;
  }

  textListContainer.innerHTML = patterns
    .map((p, idx) => {
      const global = isPatternGlobal(p);
      const inPr = isPatternInCurrentPr(p);
      const checked = global || inPr;
      const labelClass = `text-pattern${checked ? ' checked' : ''}${p.regex ? ' regex' : ''}`;
      const label = p.regex ? `/${escapeHtml(p.pattern)}/i` : escapeHtml(p.pattern);
      return `
        <div class="text-row" data-idx="${idx}">
          <input type="checkbox" class="text-check" ${checked ? 'checked' : ''} ${global ? 'disabled' : ''} />
          <span class="${labelClass}" title="${escapeHtml(p.pattern)}">${label}</span>
          <button class="icon-btn regex-btn ${p.regex ? 'active' : ''}" title="Toggle regex mode">.*</button>
          <button class="icon-btn globe-btn ${global ? 'active' : ''}" title="Toggle global">🌐</button>
          <button class="icon-btn delete-btn" title="Remove">×</button>
        </div>
      `;
    })
    .join('');

  textListContainer.querySelectorAll<HTMLDivElement>('.text-row').forEach((row) => {
    const idx = Number(row.dataset.idx);
    const entry = patterns[idx];
    if (!entry) return;

    const check = row.querySelector('.text-check') as HTMLInputElement;
    const regexBtn = row.querySelector('.regex-btn') as HTMLButtonElement;
    const globeBtn = row.querySelector('.globe-btn') as HTMLButtonElement;
    const deleteBtn = row.querySelector('.delete-btn') as HTMLButtonElement;

    check.addEventListener('change', () => {
      if (isPatternGlobal(entry)) {
        check.checked = true;
        return;
      }
      if (check.checked) {
        sendAddPattern(entry, false);
      } else {
        sendRemovePattern(entry, false);
        showReloadBanner();
      }
    });

    regexBtn.addEventListener('click', () => {
      const flipped: TextPattern = { pattern: entry.pattern, regex: !entry.regex };
      if (flipped.regex) {
        const err = validateRegex(flipped.pattern);
        if (err) {
          showTextError(`Invalid regex "${entry.pattern}": ${err}`);
          return;
        }
      }
      clearTextError();
      const wasGlobal = isPatternGlobal(entry);
      sendRemovePattern(entry, wasGlobal);
      sendAddPattern(flipped, wasGlobal);
    });

    globeBtn.addEventListener('click', () => {
      const wasGlobal = isPatternGlobal(entry);
      sendRemovePattern(entry, wasGlobal);
      sendAddPattern(entry, !wasGlobal);
      if (wasGlobal) showReloadBanner();
    });

    deleteBtn.addEventListener('click', () => {
      const inGlobal = isPatternGlobal(entry);
      const inPr = isPatternInCurrentPr(entry);
      if (inGlobal) sendRemovePattern(entry, true);
      if (inPr) sendRemovePattern(entry, false);
      showReloadBanner();
    });
  });
};

const sendAddPattern = (entry: TextPattern, asGlobal: boolean) => {
  const type = asGlobal ? 'add-text-pattern-global' : 'add-text-pattern';
  const payload = asGlobal
    ? { type, pattern: entry.pattern, regex: entry.regex }
    : { type, pattern: entry.pattern, regex: entry.regex, prPath: currentPrPath };
  chrome.runtime.sendMessage(payload, (response) => {
    if (asGlobal) textState.globalTextPatterns = response.globalTextPatterns;
    else textState.perPrTextPatterns = response.perPrTextPatterns;
    renderTextList();
  });
};

const sendRemovePattern = (entry: TextPattern, asGlobal: boolean) => {
  const type = asGlobal ? 'remove-text-pattern-global' : 'remove-text-pattern';
  const payload = asGlobal
    ? { type, pattern: entry.pattern, regex: entry.regex }
    : { type, pattern: entry.pattern, regex: entry.regex, prPath: currentPrPath };
  chrome.runtime.sendMessage(payload, (response) => {
    if (asGlobal) textState.globalTextPatterns = response.globalTextPatterns;
    else textState.perPrTextPatterns = response.perPrTextPatterns;
    renderTextList();
  });
};

const handleAddText = () => {
  const raw = textInput.value.trim();
  if (raw.length === 0) return;
  clearTextError();
  const entry: TextPattern = { pattern: raw, regex: false };
  sendAddPattern(entry, false);
  textInput.value = '';
};

reloadBtn.addEventListener('click', () => {
  if (activeTabId) {
    chrome.tabs.reload(activeTabId);
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
  [
    STORAGE_KEYS.deployEnabled,
    STORAGE_KEYS.commentsEnabled,
    STORAGE_KEYS.globalHiddenUsers,
    STORAGE_KEYS.perPrHiddenUsers,
    STORAGE_KEYS.textPatternsEnabled,
    STORAGE_KEYS.globalTextPatterns,
    STORAGE_KEYS.perPrTextPatterns,
  ],
  (result: Record<string, unknown>) => {
    logger.debug('popup storage read', result);

    updateDeployUI((result[STORAGE_KEYS.deployEnabled] as boolean) ?? true);

    commentsState = {
      enabled: (result[STORAGE_KEYS.commentsEnabled] as boolean) ?? false,
      globalHiddenUsers: (result[STORAGE_KEYS.globalHiddenUsers] as string[]) ?? [],
      perPrHiddenUsers: (result[STORAGE_KEYS.perPrHiddenUsers] as Record<string, string[]>) ?? {},
    };
    updateCommentsUI();

    textState = {
      enabled: (result[STORAGE_KEYS.textPatternsEnabled] as boolean) ?? false,
      globalTextPatterns: (result[STORAGE_KEYS.globalTextPatterns] as TextPattern[]) ?? [],
      perPrTextPatterns:
        (result[STORAGE_KEYS.perPrTextPatterns] as Record<string, TextPattern[]>) ?? {},
    };
    updateTextUI();

    getActiveTab((tab) => {
      logger.debug('popup active tab', { id: tab.id, url: tab.url });
      if (!tab.id || !tab.url) return;

      activeTabId = tab.id;
      const url = new URL(tab.url);
      const match = url.pathname.match(PR_PATH_RE);
      currentPrPath = match?.[0] ?? '';
      logger.debug('popup prPath', currentPrPath);

      fetchPrUsers(() => {
        logger.debug('popup users loaded', prUsers);
        updateCommentsUI();
        updateTextUI();
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

textToggle.addEventListener('change', () => {
  logger.debug('popup toggle-text clicked');
  chrome.runtime.sendMessage({ type: 'toggle-text' }, (response) => {
    logger.debug('popup toggle-text response', response);
    textState.enabled = response.enabled;
    updateTextUI();
  });
});

textAddBtn.addEventListener('click', handleAddText);
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAddText();
  }
});
