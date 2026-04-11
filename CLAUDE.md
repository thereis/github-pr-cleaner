# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
pnpm run build          # Bundle src/ to dist/ via Rolldown
pnpm run watch          # Bundle + watch for changes
pnpm run lint           # Lint with oxlint
pnpm run lint:fix       # Auto-fix lint issues
pnpm run format         # Format with oxfmt (writes)
pnpm run format:check   # Check formatting only
pnpm run package        # Build + zip dist/ to github-pr-cleaner.zip for Chrome Web Store
npx tsc --noEmit        # Type check (no emit; rolldown does the actual compile)
```

There is no test suite. The package manager is `pnpm` (not npm).

## Architecture

This is a Manifest V3 Chrome extension. Three independently bundled entry points share state through Chrome's messaging API:

- **Content script** (`src/content/index.ts`, IIFE) — runs on `https://github.com/*/pull/*`. Orchestrates three submodules: `deploy.ts` (hides timeline items matching `/deploy/i`), `comments.ts` (scrapes PR participants and hides items by author), `chip.ts` (floating UI counter + popover). The entry file owns all shared state and handles GitHub's SPA navigation via a `MutationObserver` on `document.body`, the `turbo:load` event, and a `spa-navigate` message from the background.
- **Background service worker** (`src/background/index.ts`, ESM) — message router. Each feature lives in its own file (`cleaner.ts`, `comments.ts`) and exports a `handlers: MessageHandlerMap` plus an optional `onInstall`. The router merges all handlers and dispatches by `message.type`. **To add a new feature, create a new file in `src/background/` exporting `handlers` + `onInstall` and register it in the `features` array in `index.ts`.** This pattern is intentional — each domain owns its message types, storage keys, and tab broadcasts with no coupling.
- **Popup** (`src/popup.ts` + `src/popup.html`, IIFE) — reads state directly from `chrome.storage.local` on open (avoids round-trip flicker), then queries the active tab via `chrome.tabs.sendMessage` for PR participants.

### SPA navigation handling

The manifest only matches `https://github.com/*/pull/*`, so the content script doesn't auto-inject when navigating from `/pulls` (the PR list) to a specific PR. The background uses `chrome.webNavigation.onHistoryStateUpdated` to detect this, then either injects the content script via `chrome.scripting.executeScript` (if not running) or sends a `spa-navigate` message (if already running, detected via a `ping` round-trip). This is in `src/background/index.ts`.

### Storage layout (chrome.storage.local)

- `enabled: boolean` — deploy hiding (defaults `true`, owned by `cleaner.ts`)
- `commentsEnabled: boolean` — comment hiding feature (defaults `false`, owned by `comments.ts`)
- `globalHiddenUsers: string[]` — usernames silenced everywhere
- `perPrHiddenUsers: Record<string, string[]>` — keyed by PR path (e.g. `/owner/repo/pull/123`)

When `comments.ts` resolves visibility, it unions `globalHiddenUsers` with `perPrHiddenUsers[currentPath]` — they are additive, no override logic.

### Build

`rolldown.config.mjs` defines three separate bundle configs (content as IIFE, popup as IIFE, background as ESM). The `copyAssets` plugin runs in the content build's `generateBundle` hook to copy `manifest.json`, `popup.html`, and the icon PNGs to `dist/`. `dist/` and `node_modules/` are gitignored.

## Coding conventions (from `~/.claude/CLAUDE.md`)

- No comments in code
- Use `type` instead of `interface`
- Prefer `handlePromise` over `try-catch`
- Don't commit unless explicitly requested
- Follow DRY: shared values (URL patterns, selectors, storage keys, regexes) belong in `src/constants.ts`, not redeclared per file
- Follow KISS: keep solutions simple; don't add abstraction, configurability, or defensive code beyond what the task requires
- For complex features, follow DDD: isolate each domain in its own module (like `src/background/{cleaner,comments}.ts`) that owns its message types, storage keys, and state; reuse existing primitives before inventing new ones

## Specs and plans

Design specs live in `docs/superpowers/specs/` and implementation plans live in `docs/superpowers/plans/`. The comment-hiding feature was built from `2026-04-10-comment-hiding-design.md` → `2026-04-10-comment-hiding.md`. Read these before extending those areas.
