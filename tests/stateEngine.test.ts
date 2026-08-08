import moment from 'moment';
import { DEFAULT_SETTINGS, type Settings } from '../src/settings';
import {
    formatFieldNow,
    formatFieldWithValue,
    getStateBySymbol,
    getStateSequence,
    hasTimePlaceholder,
    nextStatusSymbol,
    removeFieldFromBody,
    shouldCycle,
    shouldIntercept,
    splitTemplate,
    statusTransitionSymbolsForSettings,
} from '../src/stateEngine';

(window as any).moment = moment;

function settings(overrides: Partial<Settings> = {}): Settings {
    return { ...DEFAULT_SETTINGS, interceptTrigger: '', ...overrides };
}

describe('stateEngine', () => {
    it('orders states as Todo, custom states, Done', () => {
        const sequence = getStateSequence(settings());
        expect(sequence.map((state) => state.symbol)).toEqual([' ', '/', '-', 'x']);
    });

    it('uses configured names for the base states', () => {
        const configured = settings({ todoName: '未完成', doneName: '已完成' });
        const sequence = getStateSequence(configured);
        expect(sequence[0].name).toBe('未完成');
        expect(sequence[sequence.length - 1].name).toBe('已完成');
    });

    it('finds a state by symbol', () => {
        expect(getStateBySymbol(settings(), '-')?.id).toBe('cancelled');
        expect(getStateBySymbol(settings(), 'x')?.id).toBe('done');
    });

    it('intercepts all tasks when the trigger is empty', () => {
        expect(shouldIntercept('- [ ] task', settings())).toBe(true);
    });

    it('only intercepts tasks containing the trigger', () => {
        const intercepted = settings({ interceptTrigger: '#custom' });
        expect(shouldIntercept('- [ ] task #custom', intercepted)).toBe(true);
        expect(shouldIntercept('- [ ] task', intercepted)).toBe(false);
    });

    it('applies transition scope rules', () => {
        const none = settings({ transitionScope: 'none' });
        expect(shouldCycle('- [ ] task', none)).toBe(false);

        const all = settings({ transitionScope: 'all' });
        expect(shouldCycle('- [ ] task', all)).toBe(true);

        const tag = settings({ transitionScope: 'tag', transitionTrigger: '#custom' });
        expect(shouldCycle('- [ ] task #custom', tag)).toBe(true);
        expect(shouldCycle('- [ ] task', tag)).toBe(false);
    });

    it('cycles to the next custom state when transitions are enabled', () => {
        const cyclic = settings({ transitionScope: 'all' });
        expect(nextStatusSymbol(' ', '- [ ] task', cyclic)).toBe('/');
        expect(nextStatusSymbol('/', '- [/] task', cyclic)).toBe('-');
        expect(nextStatusSymbol('-', '- [-] task', cyclic)).toBe('x');
        expect(nextStatusSymbol('x', '- [x] task', cyclic)).toBe(' ');
    });

    it('toggles only between todo and done when transitions are disabled', () => {
        const plain = settings({ transitionScope: 'none' });
        expect(nextStatusSymbol(' ', '- [ ] task', plain)).toBe('x');
        expect(nextStatusSymbol('x', '- [x] task', plain)).toBe(' ');
        expect(nextStatusSymbol('/', '- [/] task', plain)).toBe('x');
    });

    it('falls back to Todo for unknown checkbox symbols', () => {
        expect(nextStatusSymbol('o', '- [o] task', settings({ transitionScope: 'none' }))).toBe(
            ' ',
        );
        expect(nextStatusSymbol('o', '- [o] task', settings({ transitionScope: 'all' }))).toBe(' ');
    });

    it('describes the current and next status according to the transition settings', () => {
        const plain = settings({ transitionScope: 'none' });
        expect(statusTransitionSymbolsForSettings(' ', plain)).toEqual({
            current: ' ',
            next: 'x',
        });
        expect(statusTransitionSymbolsForSettings('x', plain)).toEqual({
            current: 'x',
            next: ' ',
        });

        const all = settings({ transitionScope: 'all' });
        expect(statusTransitionSymbolsForSettings(' ', all)).toEqual({
            current: ' ',
            next: '/',
        });
        expect(statusTransitionSymbolsForSettings('/', all)).toEqual({
            current: '/',
            next: '-',
        });
        expect(statusTransitionSymbolsForSettings('-', all)).toEqual({
            current: '-',
            next: 'x',
        });
        expect(statusTransitionSymbolsForSettings('x', all)).toEqual({
            current: 'x',
            next: ' ',
        });

        const tagged = settings({ transitionTrigger: '#custom' });
        expect(statusTransitionSymbolsForSettings(' ', tagged)).toEqual({
            current: ' ',
            next: '/',
        });

        const taggedEmpty = settings({ transitionScope: 'tag', transitionTrigger: '' });
        expect(statusTransitionSymbolsForSettings(' ', taggedEmpty)).toEqual({
            current: ' ',
            next: '/',
        });
    });

    it('splits templates and formats field values', () => {
        expect(splitTemplate('created:: YYYY-MM-DD')).toEqual({
            prefix: 'created:: ',
            format: 'YYYY-MM-DD',
            suffix: '',
        });
        expect(formatFieldWithValue(' [created:: {{time}}]', '2026-08-07')).toBe(
            ' [created:: 2026-08-07]',
        );
        const now = moment('2026-08-07T10:30:00+08:00');
        expect(formatFieldNow('completion:: YYYY-MM-DDTHH:mm:ssZ', now, settings())).toBe(
            'completion:: YYYY-MM-DDTHH:mm:ssZ',
        );
        expect(formatFieldNow(' [completion:: {{time}}]', now, settings())).toBe(
            ' [completion:: 2026-08-07T10:30:00+08:00]',
        );
        expect(formatFieldNow(' [state:: ]', now, settings())).toBe(
            ' [state:: ]',
        );
        expect(hasTimePlaceholder(' [created:: {{time}}]')).toBe(true);
        expect(hasTimePlaceholder('created::')).toBe(false);
    });

    it('removes fields written from a template', () => {
        const body = 'task [created:: 2026-08-07]';
        const removed = removeFieldFromBody(body, ' [created:: {{time}}]');
        expect(removed.raw).toBe('[created:: 2026-08-07]');
        expect(removed.body).toBe('task');
    });
});
