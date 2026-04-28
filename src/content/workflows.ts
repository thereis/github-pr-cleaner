const MERGE_STATUS_CONTAINER_SELECTOR =
  '[class*="ExpandedChecks-module__checksContainer"], .merge-status-list';
const COMPOSER_SELECTOR = 'form#new_comment_form';
const PANEL_ID = 'ghpr-workflows-panel';
const RUN_HREF_RE = /\/actions\/runs\/(\d+)(?:\/job\/\d+)?/;

type WorkflowRun = {
  runId: string;
  name: string;
  url: string;
};

type RunGroup = {
  runId: string;
  href: string;
  name: string;
  nameFromSlash: boolean;
};

const collectRuns = (): WorkflowRun[] => {
  const scopes = document.querySelectorAll(MERGE_STATUS_CONTAINER_SELECTOR);
  if (scopes.length === 0) return [];

  const byRunId = new Map<string, RunGroup>();

  scopes.forEach((scope) => {
    const anchors = scope.querySelectorAll<HTMLAnchorElement>('a[href*="/actions/runs/"]');
    anchors.forEach((a) => {
      const href = a.getAttribute('href') ?? '';
      const match = href.match(RUN_HREF_RE);
      if (!match) return;

      const runId = match[1];
      const rawText = (a.textContent ?? '').trim();
      const hasSlash = rawText.includes(' / ');
      const name = hasSlash ? rawText.split(' / ')[0].trim() : rawText;
      if (!name) return;

      const existing = byRunId.get(runId);
      if (!existing) {
        byRunId.set(runId, { runId, href, name, nameFromSlash: hasSlash });
        return;
      }
      if (!existing.nameFromSlash && hasSlash) {
        byRunId.set(runId, { runId, href, name, nameFromSlash: true });
      }
    });
  });

  const runs: WorkflowRun[] = [];
  byRunId.forEach(({ runId, href, name }) => {
    const summaryPath = href.replace(/\/job\/\d+.*$/, '').replace(/[?#].*$/, '');
    const url = summaryPath.startsWith('http') ? summaryPath : `https://github.com${summaryPath}`;
    runs.push({ runId, name, url });
  });

  return runs;
};

const buildPanel = (runs: WorkflowRun[]): HTMLElement => {
  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  Object.assign(panel.style, {
    margin: '16px 0',
    padding: '12px 16px',
    border: '1px solid #30363d',
    borderRadius: '6px',
    background: '#161b22',
    color: '#c9d1d9',
    fontSize: '13px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    fontWeight: '600',
    marginBottom: '8px',
  });
  header.textContent = 'Workflow runs';
  panel.appendChild(header);

  const list = document.createElement('div');
  Object.assign(list.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  });

  runs.forEach((run) => {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
    });

    const nameEl = document.createElement('span');
    nameEl.textContent = run.name;
    Object.assign(nameEl.style, {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });

    const actions = document.createElement('div');
    Object.assign(actions.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      flexShrink: '0',
    });

    const runIdEl = document.createElement('span');
    runIdEl.textContent = run.runId;
    Object.assign(runIdEl.style, {
      fontSize: '12px',
      color: '#6e7681',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    });

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy ID';
    copyBtn.title = `Copy run ID ${run.runId}`;
    Object.assign(copyBtn.style, {
      padding: '4px 10px',
      borderRadius: '6px',
      border: '1px solid #30363d',
      background: '#21262d',
      color: '#c9d1d9',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
    });
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(run.runId);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = 'Copy ID';
      }, 1500);
    });

    const viewBtn = document.createElement('a');
    viewBtn.href = run.url;
    viewBtn.target = '_blank';
    viewBtn.rel = 'noopener noreferrer';
    viewBtn.textContent = 'View summary';
    Object.assign(viewBtn.style, {
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '6px',
      border: '1px solid #30363d',
      background: '#21262d',
      color: '#c9d1d9',
      textDecoration: 'none',
      fontSize: '12px',
      fontWeight: '500',
    });

    actions.appendChild(runIdEl);
    actions.appendChild(copyBtn);
    actions.appendChild(viewBtn);

    row.appendChild(nameEl);
    row.appendChild(actions);
    list.appendChild(row);
  });

  panel.appendChild(list);

  const footer = document.createElement('div');
  Object.assign(footer.style, {
    marginTop: '10px',
    paddingTop: '8px',
    borderTop: '1px solid #30363d',
    fontSize: '11px',
    color: '#6e7681',
  });
  footer.textContent = 'Added by GitHub PR Cleaner';
  panel.appendChild(footer);

  return panel;
};

const removePanel = () => {
  document.getElementById(PANEL_ID)?.remove();
};

const renderPanel = (runs: WorkflowRun[]) => {
  const composer = document.querySelector(COMPOSER_SELECTOR);
  if (!composer || !composer.parentElement) {
    removePanel();
    return;
  }

  const next = buildPanel(runs);
  const existing = document.getElementById(PANEL_ID);

  if (existing) {
    existing.replaceWith(next);
  } else {
    composer.parentElement.insertBefore(next, composer);
  }
};

const renderWorkflowsPanel = () => {
  const runs = collectRuns();
  if (runs.length === 0) {
    removePanel();
    return;
  }
  renderPanel(runs);
};

const resetWorkflows = () => {
  removePanel();
};

export { renderWorkflowsPanel, resetWorkflows };
export type { WorkflowRun };
