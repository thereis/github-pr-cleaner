import { logger } from '../logger';
import type { TextPattern } from '../constants';

const HIDDEN_ATTR = 'data-prc-text-hidden';

let matchedPatterns = new Map<string, number>();

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const labelFor = (p: TextPattern): string => (p.regex ? `/${p.pattern}/i` : p.pattern);

const compile = (p: TextPattern): RegExp | null => {
  try {
    const source = p.regex ? p.pattern : escapeRegex(p.pattern);
    return new RegExp(source, 'i');
  } catch (err) {
    logger.warn('text: failed to compile pattern', p, err);
    return null;
  }
};

const hideMatchingItems = (patterns: TextPattern[]): void => {
  showAllMatchedItems();
  matchedPatterns = new Map();
  if (patterns.length === 0) return;

  const compiled = patterns
    .map((p) => ({ label: labelFor(p), re: compile(p) }))
    .filter((c): c is { label: string; re: RegExp } => c.re !== null);

  if (compiled.length === 0) return;

  const items = document.querySelectorAll<HTMLElement>('.TimelineItem');
  items.forEach((item) => {
    const target = (item.closest('.js-timeline-item') || item) as HTMLElement;
    if (target.style.display === 'none') return;

    const text = item.textContent ?? '';
    for (const { label, re } of compiled) {
      if (re.test(text)) {
        target.setAttribute(HIDDEN_ATTR, '1');
        target.style.display = 'none';
        matchedPatterns.set(label, (matchedPatterns.get(label) ?? 0) + 1);
        break;
      }
    }
  });
};

const showAllMatchedItems = (): void => {
  const items = document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}="1"]`);
  items.forEach((item) => {
    item.removeAttribute(HIDDEN_ATTR);
    if (item.style.display === 'none') {
      item.style.display = '';
    }
  });
  matchedPatterns = new Map();
};

const getMatchedPatterns = (): Map<string, number> => matchedPatterns;

const resetText = (): void => {
  matchedPatterns = new Map();
};

export { hideMatchingItems, showAllMatchedItems, getMatchedPatterns, resetText };
