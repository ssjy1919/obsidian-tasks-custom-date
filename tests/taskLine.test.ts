import moment from 'moment';
import {
    buildEditedLine,
    createTaskLine,
    enrichToggledLine,
    formatTimestamp,
    parseTaskLine,
    toggleTaskLine,
} from '../src/taskLine';
import { DEFAULT_SETTINGS, type Settings } from '../src/settings';

(window as any).moment = moment;

const NOW = moment('2026-08-07T10:30:00+08:00');
const ISO_FORMAT = 'YYYY-MM-DDTHH:mm:ss';
const TS = '2026-08-07T10:30:00';

function settings(overrides: Partial<Settings> = {}): Settings {
    return { ...DEFAULT_SETTINGS, taskFormat: 'dataview', interceptTrigger: '', ...overrides };
}

describe('parseTaskLine', () => {
    it('parses a Dataview created field', () => {
        const parsed = parseTaskLine(`- [ ] task  [created:: ${TS}]`, ISO_FORMAT);
        expect(parsed?.description).toBe('task');
        expect(parsed?.created?.value).toBe(TS);
    });

    it('parses an emoji created field', () => {
        const parsed = parseTaskLine(`- [ ] task ➕ ${TS}`, ISO_FORMAT);
        expect(parsed?.created?.value).toBe(TS);
    });

    it('parses multiple emoji completion fields without keeping them in the description', () => {
        const line = `- [x] ff ➕ 2026-08-07T06:55:32 ✅ 2026-08-07T06:55:49 ✅ 2026-08-07T06:55:51`;
        const parsed = parseTaskLine(line, ISO_FORMAT);
        expect(parsed?.description).toBe('ff');
        expect(parsed?.created?.value).toBe('2026-08-07T06:55:32');
        expect(parsed?.done?.value).toBe('2026-08-07T06:55:51');
    });

    it('returns null for a non-task line', () => {
        expect(parseTaskLine('plain text', ISO_FORMAT)).toBeNull();
    });
});

describe('toggleTaskLine', () => {
    it('adds a completion timestamp when completing a task', () => {
        expect(toggleTaskLine('- [ ] task', settings(), NOW)).toBe(
            `- [x] task [completion:: ${TS}]`,
        );
    });

    it('adds a created timestamp on any state click when enabled', () => {
        expect(toggleTaskLine('- [ ] task', settings({ alwaysWriteCreated: true }), NOW)).toBe(
            `- [x] task [created:: ${TS}] [completion:: ${TS}]`,
        );
        expect(
            toggleTaskLine(
                '- [ ] task',
                settings({ transitionScope: 'all', alwaysWriteCreated: true }),
                NOW,
            ),
        ).toBe(`- [/] task [created:: ${TS}] [in_progress:: ${TS}]`);
    });

    it('never overwrites an existing created timestamp when the switch is enabled', () => {
        const line = `- [x] task  [created:: 2026-01-01T00:00:00]`;
        expect(toggleTaskLine(line, settings({ alwaysWriteCreated: true }), NOW)).toBe(
            `- [ ] task [created:: 2026-01-01T00:00:00]`,
        );
    });

    it('removes the completion timestamp when un-completing a task', () => {
        const input = `- [x] task  [completion:: ${TS}]  [created:: ${TS}]`;
        expect(toggleTaskLine(input, settings(), NOW)).toBe(`- [ ] task [created:: ${TS}]`);
    });

    it('moves custom states to done when transitions are disabled', () => {
        expect(toggleTaskLine('- [-] task', settings(), NOW)).toBe(
            `- [x] task [completion:: ${TS}]`,
        );
        expect(toggleTaskLine('- [/] task', settings(), NOW)).toBe(
            `- [x] task [completion:: ${TS}]`,
        );
    });

    it('moves unknown checkbox symbols to todo', () => {
        expect(toggleTaskLine('- [o] task', settings(), NOW)).toBe(
            `- [ ] task [created:: ${TS}]`,
        );
        expect(toggleTaskLine('- [o] task', settings({ transitionScope: 'all' }), NOW)).toBe(
            `- [ ] task [created:: ${TS}]`,
        );
    });

    it('preserves unknown trailing fields', () => {
        const input = `- [ ] task 📅 2026-01-01  [created:: ${TS}]`;
        expect(toggleTaskLine(input, settings(), NOW)).toBe(
            `- [x] task 📅 2026-01-01 [created:: ${TS}] [completion:: ${TS}]`,
        );
    });

    it('removes all legacy emoji completion fields when un-completing', () => {
        const line = `- [x] ff ➕ 2026-08-07T06:55:32 ✅ 2026-08-07T06:55:49 ✅ 2026-08-07T06:55:51`;
        expect(toggleTaskLine(line, settings(), NOW)).toBe(
            '- [ ] ff [created:: 2026-08-07T06:55:32]',
        );
    });

    it('only writes timestamps when the interception trigger matches', () => {
        const intercepted = settings({ interceptTrigger: '#custom', transitionScope: 'none' });
        expect(toggleTaskLine('- [ ] task #custom', intercepted, NOW)).toBe(
            `- [x] task #custom [completion:: ${TS}]`,
        );
        expect(toggleTaskLine('- [ ] task', intercepted, NOW)).toBe('- [x] task');
    });

    it('defaults transition scope to tagged tasks only', () => {
        expect(toggleTaskLine('- [ ] task #custom', settings(), NOW)).toBe(
            `- [/] task #custom [in_progress:: ${TS}]`,
        );
        expect(toggleTaskLine('- [ ] task', settings(), NOW)).toBe(
            `- [x] task [completion:: ${TS}]`,
        );
    });

    it('cycles through custom states when transitions are enabled for all tasks', () => {
        const cyclic = settings({ transitionScope: 'all' });
        expect(toggleTaskLine('- [ ] task', cyclic, NOW)).toBe(
            `- [/] task [in_progress:: ${TS}]`,
        );
        expect(toggleTaskLine('- [/] task', cyclic, NOW)).toBe(
            `- [-] task [cancelled:: ${TS}]`,
        );
        expect(toggleTaskLine('- [-] task', cyclic, NOW)).toBe(
            `- [x] task [completion:: ${TS}]`,
        );
        expect(toggleTaskLine('- [x] task', cyclic, NOW)).toBe(
            `- [ ] task [created:: ${TS}]`,
        );
    });

    it('uses the done format template when it is customized', () => {
        expect(toggleTaskLine('- [ ] task', settings({ doneFormat: '➕ {{time}}' }), NOW)).toBe(
            `- [x] task ➕ ${TS}`,
        );
    });

    it('writes the template literally when it has no time placeholder', () => {
        expect(toggleTaskLine('- [ ] task', settings({ doneFormat: ' [state:: ]' }), NOW)).toBe(
            '- [x] task [state:: ]',
        );
    });
});

describe('enrichToggledLine', () => {
    it('adds a completion timestamp when the native toggle completed the task', () => {
        const line = `- [x] task  [created:: ${TS}]`;
        expect(enrichToggledLine(line, settings(), NOW)).toBe(
            `- [x] task [created:: ${TS}] [completion:: ${TS}]`,
        );
    });

    it('adds a created timestamp to completed tasks when the switch is enabled', () => {
        expect(enrichToggledLine('- [x] task', settings({ alwaysWriteCreated: true }), NOW)).toBe(
            `- [x] task [created:: ${TS}] [completion:: ${TS}]`,
        );
    });

    it('removes a completion timestamp when the native toggle uncompleted the task', () => {
        const line = `- [ ] task  [completion:: ${TS}]  [created:: ${TS}]`;
        expect(enrichToggledLine(line, settings(), NOW)).toBe(`- [ ] task [created:: ${TS}]`);
    });

    it('removes a cancelled timestamp when the native toggle left cancelled status', () => {
        const line = `- [ ] task  [cancelled:: ${TS}]`;
        expect(enrichToggledLine(line, settings(), NOW)).toBe(`- [ ] task [created:: ${TS}]`);
    });

    it('does not enrich tasks that do not match the interception trigger', () => {
        const intercepted = settings({ interceptTrigger: '#custom' });
        expect(enrichToggledLine('- [x] task', intercepted, NOW)).toBe('- [x] task');
    });

    it('collapses duplicate completion fields', () => {
        const line =
            '- [x] #custom 任务二 [created:: 2026-08-07] [completion:: 2026-08-07] [completion:: 2026-08-07]';
        expect(enrichToggledLine(line, settings(), NOW)).toBe(
            '- [x] #custom 任务二 [created:: 2026-08-07] [completion:: 2026-08-07]',
        );
    });

    it('never accumulates duplicate completion fields over repeated toggles', () => {
        const intercepted = settings({ interceptTrigger: '#custom' });
        let line = '- [ ] #custom 任务二 [created:: 2026-08-07]';
        for (let i = 0; i < 5; i++) {
            line = toggleTaskLine(line, intercepted, NOW) ?? line;
        }
        const completionCount = line.split('completion::').length - 1;
        expect(completionCount).toBeLessThanOrEqual(1);
    });
});

describe('buildEditedLine', () => {
    it('fills in a missing created timestamp when editing', () => {
        const parsed = parseTaskLine('- [ ] task', ISO_FORMAT);
        expect(parsed).not.toBeNull();
        const result = buildEditedLine(parsed!, {
            description: 'task edited',
            statusSymbol: ' ',
            settings: settings(),
            now: NOW,
        });
        expect(result).toBe(`- [ ] task edited [created:: ${TS}]`);
    });

    it('never overwrites an existing created timestamp', () => {
        const parsed = parseTaskLine(
            `- [ ] task  [created:: 2026-01-01T00:00:00]`,
            ISO_FORMAT,
        );
        const result = buildEditedLine(parsed!, {
            description: 'task',
            statusSymbol: ' ',
            settings: settings(),
            now: NOW,
        });
        expect(result).toBe('- [ ] task [created:: 2026-01-01T00:00:00]');
    });

    it('adds and removes cancelled timestamps with the status', () => {
        const parsed = parseTaskLine('- [ ] task', ISO_FORMAT);
        const cancelled = buildEditedLine(parsed!, {
            description: 'task',
            statusSymbol: '-',
            settings: settings(),
            now: NOW,
        });
        expect(cancelled).toBe(`- [-] task [cancelled:: ${TS}]`);

        const parsedCancelled = parseTaskLine(cancelled, ISO_FORMAT);
        const reopened = buildEditedLine(parsedCancelled!, {
            description: 'task',
            statusSymbol: ' ',
            settings: settings(),
            now: NOW,
        });
        expect(reopened).toBe(`- [ ] task [created:: ${TS}]`);
    });
});

describe('custom time formats', () => {
    it('formats timestamps using the selected preset and custom formats', () => {
        expect(formatTimestamp(settings({ timeFormat: 'dateOnly' }), NOW)).toBe('2026-08-07');
        expect(formatTimestamp(settings({ timeFormat: 'dateTimeSpace' }), NOW)).toBe(
            '2026-08-07 10:30',
        );

        const custom = settings({ timeFormat: 'custom', customTimeFormat: 'YYYY/MM/DD HH:mm' });
        expect(formatTimestamp(custom, NOW)).toBe('2026/08/07 10:30');
    });

    it('writes created fields using the todo format template when it contains the time placeholder', () => {
        const custom = settings({ todoFormat: 'created:: {{time}}' });
        const parsed = parseTaskLine('- [ ] task', ISO_FORMAT);
        const result = buildEditedLine(parsed!, {
            description: 'task',
            statusSymbol: ' ',
            settings: custom,
            now: NOW,
        });
        expect(result).toBe(`- [ ] task created:: ${TS}`);
    });
});

describe('createTaskLine', () => {
    it('creates a task with a created timestamp', () => {
        expect(createTaskLine('', 'buy milk', ' ', settings(), NOW)).toBe(
            `- [ ] buy milk [created:: ${TS}]`,
        );
    });

    it('preserves indentation and list marker from a list item', () => {
        expect(createTaskLine('  - old', 'new text', ' ', settings(), NOW)).toBe(
            `  - [ ] new text [created:: ${TS}]`,
        );
    });

    it('does not write timestamps when the interception trigger does not match', () => {
        const intercepted = settings({ interceptTrigger: '#custom' });
        expect(createTaskLine('- [ ] task', 'buy milk', ' ', intercepted, NOW)).toBe(
            '- [ ] buy milk',
        );
    });
});
