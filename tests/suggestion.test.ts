import moment from 'moment';
import { DEFAULT_SETTINGS, type Settings } from '../src/settings';
import { buildCreatedDateSuggestions } from '../src/suggestion';

(window as any).moment = moment;

function settings(overrides: Partial<Settings> = {}): Settings {
    return { ...DEFAULT_SETTINGS, taskFormat: 'dataview', interceptTrigger: '', ...overrides };
}

describe('buildCreatedDateSuggestions', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2026-08-07T10:30:00+08:00'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('puts the created time suggestion first when the trigger character is typed', () => {
        const line = '- [ ] buy milk ';
        const suggestions = buildCreatedDateSuggestions(line, line.length, settings(), 'Created time', '⏎');
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0].kind).toBe('created');
        expect(suggestions[0]).toMatchObject({
            replaceFrom: line.length,
            replaceTo: line.length,
            appendText: '[created:: 2026-08-07T10:30:00+08:00]',
            displayText: 'Created time: 2026-08-07T10:30:00+08:00',
        });
        expect(suggestions[1].kind).toBe('empty');
    });

    it('uses a custom trigger character from settings', () => {
        const line = '- [ ] task @';
        const suggestions = buildCreatedDateSuggestions(
            line,
            line.length,
            settings({ suggestTrigger: '@' }),
            'Created time',
            '⏎',
        );
        expect(suggestions).toHaveLength(2);
        expect(suggestions[0].kind).toBe('created');
        expect(suggestions[0].appendText).toBe(' [created:: 2026-08-07T10:30:00+08:00]');
    });

    it('does not trigger on the word "created"', () => {
        const line = '- [ ] task created';
        expect(buildCreatedDateSuggestions(line, line.length, settings(), 'Created time', '⏎')).toEqual([]);
    });

    it('does not trigger on the emoji symbol', () => {
        const line = '- [ ] task ➕';
        expect(
            buildCreatedDateSuggestions(line, line.length, settings({ taskFormat: 'emoji' }), 'Created time', '⏎'),
        ).toEqual([]);
    });

    it('returns empty when the task already has a created field', () => {
        const line = '- [ ] task  [created:: 2026-08-07T10:30:00+08:00]';
        expect(buildCreatedDateSuggestions(line, line.length, settings(), 'Created time', '⏎')).toEqual([]);
    });

    it('returns empty for non-task lines and cursor positions before the description', () => {
        expect(buildCreatedDateSuggestions('plain ', 6, settings(), 'Created time', '⏎')).toEqual([]);
        expect(buildCreatedDateSuggestions('- [ ] ', 3, settings(), 'Created time', '⏎')).toEqual([]);
    });

    it('returns empty when there is no trigger character', () => {
        expect(buildCreatedDateSuggestions('- [ ] task', 8, settings(), 'Created time', '⏎')).toEqual([]);
    });
});
