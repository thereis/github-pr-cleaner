import { TIMELINE_ITEM_SELECTOR } from '../constants';

const DEPLOY_PATTERN = /deploy/i;

let hiddenCount = 0;

const isPrDescription = (el: Element) =>
  el.matches('.js-command-palette-pull-body') ||
  el.closest('.js-command-palette-pull-body') !== null;

const hideDeployItems = (root?: Element) => {
  const items = (root || document).querySelectorAll('.TimelineItem');

  items.forEach((item) => {
    const target = (item.closest('.js-timeline-item') || item) as HTMLElement;
    if (isPrDescription(target)) return;
    if (!DEPLOY_PATTERN.test(item.textContent ?? '')) return;
    if (target.style.display === 'none') return;
    target.style.display = 'none';
    hiddenCount++;
  });

  return hiddenCount;
};

const showDeployItems = () => {
  const items = document.querySelectorAll(TIMELINE_ITEM_SELECTOR);

  items.forEach((item) => {
    const el = item as HTMLElement;
    if (el.style.display === 'none' && DEPLOY_PATTERN.test(el.textContent ?? '')) {
      el.style.display = '';
    }
  });

  hiddenCount = 0;
};

const expandHiddenItems = () => {
  const buttons = document.querySelectorAll<HTMLButtonElement>('button.ajax-pagination-btn');

  buttons.forEach((btn) => {
    if (/hidden\s*items?/i.test(btn.textContent ?? '')) {
      btn.click();
    }
  });
};

const getHiddenCount = () => hiddenCount;

const resetDeploy = () => {
  hiddenCount = 0;
};

export { hideDeployItems, showDeployItems, expandHiddenItems, getHiddenCount, resetDeploy };
