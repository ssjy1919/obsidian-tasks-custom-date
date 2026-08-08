# Tasks custom date

[中文](README_zh-CN.md)

Automatically write created, completion and cancelled timestamps when tasks change state. Supports custom state transitions, configurable field templates, a unified time format, creation-time suggestions, and multiple languages.

## Features

### Task interception strategy

- The setting "Interception trigger tag/text" defaults to `#custom`.
- Only tasks containing the tag/text are intercepted for timestamp writes and state transitions.
- Leave the input empty to intercept all tasks (global mode).

### State transition engine

- Fixed base states: incomplete `[ ]` and done `[x]`.
- Add any number of custom intermediate states with a name and icon character; list order defines the click cycle.
- Transition scope:
  - Default "only specified tag/text tasks transition": only tasks containing the transition trigger tag/text cycle through states.
  - "All tasks transition": all tasks cycle through states.
  - "No transition": clicking toggles only between incomplete and done; intermediate states are not involved.
- The transition trigger tag/text is independent of the interception trigger tag/text.
- Unconfigured state icons (for example `[o]`) fall back to incomplete `[ ]` when clicked.
- The state row shows the transition path, for example `[x]         ( ◔ ω◔) ⇨         [/]`.

### Field formats and writes

- Each state has a format template; `{{time}}` is replaced with the current time when the task enters that state.
- Templates without `{{time}}` are written literally and do not append a timestamp.
- All time fields share the "Time format" setting: `YYYY-MM-DDTHH:mm:ss`, `YYYY-MM-DD HH:mm`, `YYYY-MM-DD`, or a custom moment.js format.
- A live preview is shown below the custom format input, with the [moment.js formatting guide](https://momentjs.com/docs/#/displaying/).
- "Always write created time": when enabled, a missing created time is written whenever a task in any state is clicked; existing created time is never overwritten.

Examples:

- ` [created:: {{time}}]` → ` [created:: 2026-08-08T04:15:04]`
- ` [completion:: {{time}}]` → ` [completion:: 2026-08-08T04:15:04]`
- ` [cancelled:: {{time}}]` → ` [cancelled:: 2026-08-08T04:15:04]`

### Created time suggestions

- Typing the suggestion trigger character (default space) in a task line shows a created time suggestion.
- The suggestion uses the incomplete state's format template.

## Commands

- `Create or edit task`: create or edit a task
- `Toggle task done`: toggle task state
- `Insert created time`: insert a created time field into a task line

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
npm run reload
```

## Source

This plugin is derived from the open-source project [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks), keeping the task timestamp write/remove approach while adding custom state transitions, format templates, a unified time format, and multilingual support. The upstream project is MIT licensed, and this plugin keeps its [LICENSE](LICENSE).
