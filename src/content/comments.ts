import { TIMELINE_ITEM_SELECTOR } from '../constants';

let silencedUsers = new Map<string, number>();

const getPrAuthor = (): string | null => {
  const authorEl = document.querySelector('.gh-header-meta .author');
  return authorEl?.textContent?.trim() ?? null;
};

const getPrUsers = (): { author: string | null; users: string[] } => {
  const author = getPrAuthor();
  const userSet = new Set<string>();

  const authorLinks = document.querySelectorAll('.js-timeline-item .author, .TimelineItem .author');

  authorLinks.forEach((link) => {
    const username = link.textContent?.trim();
    if (username && username !== author) {
      userSet.add(username);
    }
  });

  return { author, users: Array.from(userSet) };
};

const getTimelineItemAuthor = (item: Element): string | null => {
  const authorEl = item.querySelector('.author');
  return authorEl?.textContent?.trim() ?? null;
};

const hideUserComments = (hiddenUsernames: string[]) => {
  silencedUsers = new Map<string, number>();
  if (hiddenUsernames.length === 0) return silencedUsers;

  const hiddenSet = new Set(hiddenUsernames);
  const items = document.querySelectorAll(TIMELINE_ITEM_SELECTOR);

  items.forEach((item) => {
    const el = item as HTMLElement;
    const author = getTimelineItemAuthor(el);
    if (!author || !hiddenSet.has(author)) return;

    if (el.style.display !== 'none') {
      el.style.display = 'none';
    }

    silencedUsers.set(author, (silencedUsers.get(author) ?? 0) + 1);
  });

  return silencedUsers;
};

const showAllComments = () => {
  const items = document.querySelectorAll(TIMELINE_ITEM_SELECTOR);

  items.forEach((item) => {
    const el = item as HTMLElement;
    if (el.style.display === 'none') {
      const author = getTimelineItemAuthor(el);
      if (author && silencedUsers.has(author)) {
        el.style.display = '';
      }
    }
  });

  silencedUsers = new Map();
};

const getSilencedUsers = () => silencedUsers;

const resetComments = () => {
  silencedUsers = new Map();
};

export { getPrUsers, hideUserComments, showAllComments, getSilencedUsers, resetComments };
