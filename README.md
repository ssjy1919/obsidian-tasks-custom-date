# Tasks custom date

Automatically write created, completion and cancelled timestamps when tasks change state. Supports custom state transitions, configurable field templates, a unified time format, creation-time suggestions, and multiple languages.

## Features

- Only intercept tasks containing the configured trigger tag or text, or all tasks when left empty.
- Cycle through Todo, Done, and any custom intermediate states when a task checkbox is clicked.
- Write each state's configured template, replacing `{{time}}` with the current time.
- Keep existing timestamps untouched unless a template is explicitly written.

## Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
2. Place them in `.obsidian/plugins/tasks-custom-date/`.
3. Enable **Tasks custom date** in the Obsidian community plugins settings.

## Development

```bash
npm install
npm test
npm run build
npm run plugin:reload
```

## Chinese documentation

[Chinese documentation](README_zh-CN.md)
