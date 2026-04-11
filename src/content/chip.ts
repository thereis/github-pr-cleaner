let chipEl: HTMLElement | null = null;
let popoverEl: HTMLElement | null = null;
let popoverVisible = false;

type ChipData = {
  deployCount: number;
  silencedUsers: Map<string, number>;
  matchedTextPatterns: Map<string, number>;
};

let currentData: ChipData = {
  deployCount: 0,
  silencedUsers: new Map(),
  matchedTextPatterns: new Map(),
};

const ensureChip = () => {
  if (chipEl) return chipEl;

  chipEl = document.createElement('div');
  chipEl.id = 'pr-cleaner-chip';
  Object.assign(chipEl.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '9999',
    padding: '6px 14px',
    borderRadius: '20px',
    background: '#1f6feb',
    color: '#fff',
    fontSize: '13px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontWeight: '500',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    transition: 'opacity 0.3s',
    opacity: '0',
    cursor: 'pointer',
  });

  chipEl.addEventListener('click', togglePopover);
  document.body.appendChild(chipEl);
  document.addEventListener('click', onDocumentClick);

  return chipEl;
};

const ensurePopover = () => {
  if (popoverEl) return popoverEl;

  popoverEl = document.createElement('div');
  popoverEl.id = 'pr-cleaner-popover';
  Object.assign(popoverEl.style, {
    position: 'fixed',
    bottom: '56px',
    right: '20px',
    zIndex: '9998',
    padding: '12px 16px',
    borderRadius: '12px',
    background: '#161b22',
    color: '#c9d1d9',
    fontSize: '13px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    border: '1px solid #30363d',
    display: 'none',
    minWidth: '200px',
  });

  document.body.appendChild(popoverEl);
  return popoverEl;
};

const togglePopover = (e: Event) => {
  e.stopPropagation();
  popoverVisible = !popoverVisible;
  const popover = ensurePopover();
  popover.style.display = popoverVisible ? 'block' : 'none';
  if (popoverVisible) renderPopover();
};

const onDocumentClick = (e: Event) => {
  if (!popoverVisible) return;
  if (popoverEl?.contains(e.target as Node)) return;
  popoverVisible = false;
  popoverEl!.style.display = 'none';
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderPopover = () => {
  const popover = ensurePopover();
  const lines: string[] = [];

  lines.push(`<div style="margin-bottom:8px;font-weight:600">Summary</div>`);
  lines.push(`<div>💬 Deploy items hidden: <strong>${currentData.deployCount}</strong></div>`);

  if (currentData.silencedUsers.size > 0) {
    lines.push(`<div style="margin-top:8px;font-weight:600">🚫 Silenced users</div>`);
    for (const [user, count] of currentData.silencedUsers) {
      lines.push(`<div style="padding-left:8px">@${escapeHtml(user)} — ${count} comments</div>`);
    }
  }

  if (currentData.matchedTextPatterns.size > 0) {
    lines.push(`<div style="margin-top:8px;font-weight:600">🔍 Hidden by text</div>`);
    for (const [label, count] of currentData.matchedTextPatterns) {
      lines.push(
        `<div style="padding-left:8px">${escapeHtml(label)} — ${count} item${count === 1 ? '' : 's'}</div>`,
      );
    }
  }

  popover.innerHTML = lines.join('');
};

const updateChip = (data: ChipData) => {
  currentData = data;
  const chip = ensureChip();
  const total = data.deployCount + data.silencedUsers.size + data.matchedTextPatterns.size;

  if (total === 0) {
    chip.style.opacity = '0';
    chip.style.pointerEvents = 'none';
    return;
  }

  const parts: string[] = [];
  if (data.deployCount > 0) parts.push(`💬 ${data.deployCount}`);
  if (data.silencedUsers.size > 0) parts.push(`🚫 ${data.silencedUsers.size}`);
  if (data.matchedTextPatterns.size > 0) parts.push(`🔍 ${data.matchedTextPatterns.size}`);

  chip.textContent = parts.join('  ');
  chip.style.opacity = '1';
  chip.style.pointerEvents = 'auto';

  if (popoverVisible) renderPopover();
};

const hideChip = () => {
  if (chipEl) {
    chipEl.style.opacity = '0';
    chipEl.style.pointerEvents = 'none';
  }
  if (popoverEl) popoverEl.style.display = 'none';
  popoverVisible = false;
};

export { updateChip, hideChip };
export type { ChipData };
