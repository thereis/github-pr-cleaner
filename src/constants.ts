const PR_URL_MATCH_PATTERN = 'https://github.com/*/pull/*';
const PR_URL_RE = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/;
const PR_PATH_RE = /^\/[^/]+\/[^/]+\/pull\/\d+/;
const PR_CONVERSATION_PATH_RE = /^\/[^/]+\/[^/]+\/pull\/\d+\/?$/;

const TIMELINE_ITEM_SELECTOR = '.js-timeline-item, .TimelineItem';

const STORAGE_KEYS = {
  deployEnabled: 'enabled',
  commentsEnabled: 'commentsEnabled',
  globalHiddenUsers: 'globalHiddenUsers',
  perPrHiddenUsers: 'perPrHiddenUsers',
  textPatternsEnabled: 'textPatternsEnabled',
  globalTextPatterns: 'globalTextPatterns',
  perPrTextPatterns: 'perPrTextPatterns',
} as const;

type TextPattern = {
  pattern: string;
  regex: boolean;
};

export {
  PR_URL_MATCH_PATTERN,
  PR_URL_RE,
  PR_PATH_RE,
  PR_CONVERSATION_PATH_RE,
  TIMELINE_ITEM_SELECTOR,
  STORAGE_KEYS,
};
export type { TextPattern };
