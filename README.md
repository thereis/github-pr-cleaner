# GitHub PR Cleaner

Chrome extension that automatically hides deployment noise from GitHub pull request timelines.

## What it does

GitHub PR timelines get cluttered with deployment status updates, making it hard to follow the actual conversation. This extension hides those items and shows a small counter chip so you know how many were cleaned up.

- Hides timeline items matching deployment patterns
- Expands collapsed "hidden items" sections and cleans those too
- Works with GitHub's SPA navigation (Turbo)
- Toggle on/off from the extension popup

## Install

1. Clone the repo and install dependencies:

```sh
pnpm install
pnpm run build
```

2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `dist/` folder

## Development

```sh
pnpm run build          # Bundle to dist/
pnpm run watch          # Bundle + watch for changes
pnpm run lint           # Lint with oxlint
pnpm run lint:fix       # Lint and auto-fix
pnpm run format         # Format with oxfmt
pnpm run format:check   # Check formatting
```

## Tech stack

- **TypeScript**
- **Rolldown** — bundler
- **oxlint** — linter
- **oxfmt** — formatter

## Project structure

```
src/
  content.ts          Content script injected into GitHub PR pages
  popup.html          Extension popup UI
  popup.ts            Popup toggle logic
  background/
    index.ts          Message router
    cleaner.ts        Deploy hiding state management
    types.ts          Shared types for message handlers
  manifest.json       Chrome extension manifest (v3)
```

## License

ISC
