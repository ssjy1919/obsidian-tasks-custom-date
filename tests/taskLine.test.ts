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
const ISO_FORMAT = 'YYYY-MM-DDTHH:mm:ssZ';

function settings(overrides: Partial<Settings> = {}): Settings {
    return { ...DEFAULT_SETTINGS, taskFormat: 'dataview', ...overrides };
}

describe('parseTaskLine', () => {
    it('parses a Dataview created field', () => {
        const parsed = parseTaskLine(
            '- [ ] task  [created:: 2026-08-07T10:30:00+08:00]',
            ISO_FORMAT,
        );
        expect(parsed?.description).toBe('task');
        expect(parsed?.created?.value).toBe('2026-08-07T10:30:00+08:00');
    });

    it('parses an emoji created field', () => {
        const parsed = parseTaskLine('- [ ] task ➕ 2026-08-07T10:30:00+08:00', ISO_FORMAT);
        expect(parsed?.created?.value).toBe('2026-08-07T10:30:00+08:00');
    });

    it('parses multiple emoji completion fields without keeping them in the description', () => {
        const line =
            '- [x] ff ➕ 2026-08-07T06:55:32+08:00 ✅ 2026-08-07T06:55:49+08:00 ✅ 2026-08-07T06:55:51+08:00';
        const parsed = parseTaskLine(line, ISO_FORMAT);
        expect(parsed?.description).toBe('ff');
        expect(parsed?.created?.value).toBe('2026-08-07T06:55:32+08:00');
        expect(parsed?.done?.value).toBe('2026-08-07T06:55:51+08:00');
    });

    it('returns null for a non-task line', () => {
        expect(parseTaskLine('plain text', ISO_FORMAT)).toBeNull();
    });
});

describe('toggleTaskLine', () => {
    it('adds a completion timestamp when completing a task', () => {
        expect(toggleTaskLine('- [ ] task', settings(), NOW)).toBe(
            '- [x] task  [completion:: 2026-08-07T10:30:00+08:00]',
        );
    });

    it('removes the completion timestamp when un-completing a task', () => {
        const input =
            '- [x] task  [completion:: 2026-08-07T10:30:00+08:00]  [created:: 2026-08-07T10:30:00+08:00]';
        expect(toggleTaskLine(input, settings(), NOW)).toBe(
            '- [ ] task  [created:: 2026-08-07T10:30:00+08:00]',
        );
    });

    it('removes the cancelled timestamp when leaving cancelled status', () => {
        const input = '- [-] task  [cancelled:: 2026-08-07T10:30:00+08:00]';
        expect(toggleTaskLine(input, settings(), NOW)).toBe('- [ ] task');
    });

    it('adds a completion timestamp for in-progress tasks', () => {
        expect(toggleTaskLine('- [/] task', settings(), NOW)).toBe(
            '- [x] task  [completion:: 2026-08-07T10:30:00+08:00]',
        );
    });

    it('preserves unknown trailing fields', () => {
        const input = '- [ ] task 📅 2026-01-01  [created:: 2026-08-07T10:30:00+08:00]';
        expect(toggleTaskLine(input, settings(), NOW)).toBe(
            '- [x] task 📅 2026-01-01  [created:: 2026-08-07T10:30:00+08:00]  [completion:: 2026-08-07T10:30:00+08:00]',
        );
    });

    it('writes emoji fields when emoji format is selected', () => {
        expect(toggleTaskLine('- [ ] task', settings({ taskFormat: 'emoji' }), NOW)).toBe(
            '- [x] task ✅ 2026-08-07T10:30:00+08:00',
        );
    });

    it('removes all emoji completion fields when un-completing', () => {
        const line =
            '- [x] ff ➕ 2026-08-07T06:55:32+08:00 ✅ 2026-08-07T06:55:49+08:00 ✅ 2026-08-07T06:55:51+08:00';
        expect(toggleTaskLine(line, settings({ taskFormat: 'emoji' }), NOW)).toBe(
            '- [ ] ff ➕ 2026-08-07T06:55:32+08:00',
        );
    });
});

describe('enrichToggledLine', () => {
    it('adds a completion timestamp when the native toggle completed the task', () => {
        const line = '- [x] task  [created:: 2026-08-07T10:30:00+08:00]';
        expect(enrichToggledLine(line, settings(), NOW)).toBe(
            '- [x] task  [created:: 2026-08-07T10:30:00+08:00]  [completion:: 2026-08-07T10:30:00+08:00]',
        );
    });

    it('removes a completion timestamp when the native toggle uncompleted the task', () => {
        const line =
            '- [ ] task  [completion:: 2026-08-07T10:30:00+08:00]  [created:: 2026-08-07T10:30:00+08:00]';
        expect(enrichToggledLine(line, settings(), NOW)).toBe(
            '- [ ] task  [created:: 2026-08-07T10:30:00+08:00]',
        );
    });

    it('removes a cancelled timestamp when the native toggle left cancelled status', () => {
        const line = '- [ ] task  [cancelled:: 2026-08-07T10:30:00+08:00]';
        expect(enrichToggledLine(line, settings(), NOW)).toBe('- [ ] task');
    });

    it('does not add completion timestamps when the setting is disabled', () => {
        expect(enrichToggledLine('- [x] task', settings({ setDoneDate: false }), NOW)).toBe(
            '- [x] task',
        );
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
        expect(result).toBe('- [ ] task edited  [created:: 2026-08-07T10:30:00+08:00]');
    });

    it('never overwrites an existing created timestamp', () => {
        const parsed = parseTaskLine(
            '- [ ] task  [created:: 2026-01-01T00:00:00+08:00]',
            ISO_FORMAT,
        );
        const result = buildEditedLine(parsed!, {
            description: 'task',
            statusSymbol: ' ',
            settings: settings(),
            now: NOW,
        });
        expect(result).toBe('- [ ] task  [created:: 2026-01-01T00:00:00+08:00]');
    });

    it('adds and removes cancelled timestamps with the status', () => {
        const parsed = parseTaskLine('- [ ] task', ISO_FORMAT);
        const cancelled = buildEditedLine(parsed!, {
            description: 'task',
            statusSymbol: '-',
            settings: settings(),
            now: NOW,
        });
        expect(cancelled).toBe(
            '- [-] task  [created:: 2026-08-07T10:30:00+08:00]  [cancelled:: 2026-08-07T10:30:00+08:00]',
        );

        const parsedCancelled = parseTaskLine(cancelled, ISO_FORMAT);
        const reopened = buildEditedLine(parsedCancelled!, {
            description: 'task',
            statusSymbol: ' ',
            settings: settings(),
            now: NOW,
        });
        expect(reopened).toBe('- [ ] task  [created:: 2026-08-07T10:30:00+08:00]');
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

    it('writes custom-format timestamps into created fields', () => {
        const custom = settings({ timeFormat: 'custom', customTimeFormat: 'YYYY/MM/DD HH:mm' });
        const parsed = parseTaskLine('- [ ] task', 'YYYY/MM/DD HH:mm');
        const result = buildEditedLine(parsed!, {
            description: 'task',
            statusSymbol: ' ',
            settings: custom,
            now: NOW,
        });
        expect(result).toBe('- [ ] task  [created:: 2026/08/07 10:30]');
    });
});

describe('createTaskLine', () => {
    it('creates a task with a created timestamp', () => {
        expect(createTaskLine('', 'buy milk', ' ', settings(), NOW)).toBe(
            '- [ ] buy milk  [created:: 2026-08-07T10:30:00+08:00]',
        );
    });

    it('preserves indentation and list marker from a list item', () => {
        expect(createTaskLine('  - old', 'new text', ' ', settings(), NOW)).toBe(
            '  - [ ] new text  [created:: 2026-08-07T10:30:00+08:00]',
        );
    });
});
