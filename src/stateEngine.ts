import type { Moment } from 'moment';
import { getTimeFormat, type Settings, type TaskStateConfig } from './settings';

export const TODO_STATE: TaskStateConfig = {
    id: 'todo',
    name: 'Todo',
    symbol: ' ',
    format: ' [created:: {{time}}]',
    autoWrite: true,
};

export const DONE_STATE: TaskStateConfig = {
    id: 'done',
    name: 'Done',
    symbol: 'x',
    format: ' [completion:: {{time}}]',
    autoWrite: true,
};

export function getStateSequence(settings: Settings): TaskStateConfig[] {
    return [
        {
            ...TODO_STATE,
            name: settings.todoName,
            format: settings.todoFormat,
            autoWrite: settings.todoAutoWrite,
        },
        ...settings.customStates,
        {
            ...DONE_STATE,
            name: settings.doneName,
            format: settings.doneFormat,
            autoWrite: settings.doneAutoWrite,
        },
    ];
}

export function getStateBySymbol(settings: Settings, symbol: string): TaskStateConfig | undefined {
    return getStateSequence(settings).find((state) => state.symbol === symbol);
}

export function shouldIntercept(line: string, settings: Settings): boolean {
    const trigger = settings.interceptTrigger.trim();
    return trigger.length === 0 || line.includes(trigger);
}

export function shouldCycle(line: string, settings: Settings): boolean {
    if (settings.transitionScope === 'none') {
        return false;
    }
    if (settings.transitionScope === 'all') {
        return true;
    }
    const trigger = settings.transitionTrigger.trim();
    return trigger.length === 0 || line.includes(trigger);
}

export function nextStatusSymbol(
    currentSymbol: string,
    line: string,
    settings: Settings,
): string | null {
    const sequence = getStateSequence(settings);
    const index = sequence.findIndex((state) => state.symbol === currentSymbol);
    if (index === -1) {
        // Unknown checkbox symbols are treated as Todo so clicking them always
        // moves the task into the configured incomplete state.
        return TODO_STATE.symbol;
    }
    if (shouldCycle(line, settings)) {
        return sequence[(index + 1) % sequence.length].symbol;
    }
    if (currentSymbol === DONE_STATE.symbol) {
        return TODO_STATE.symbol;
    }
    return DONE_STATE.symbol;
}

export function statusTransitionSymbolsForSettings(
    currentSymbol: string,
    settings: Settings,
): { current: string; next: string } {
    const sequence = getStateSequence(settings);
    const index = sequence.findIndex((state) => state.symbol === currentSymbol);
    if (index === -1) {
        return { current: TODO_STATE.symbol, next: TODO_STATE.symbol };
    }
    if (settings.transitionScope !== 'none') {
        return {
            current: sequence[index].symbol,
            next: sequence[(index + 1) % sequence.length].symbol,
        };
    }
    const next = nextStatusSymbol(currentSymbol, '- [ ] task', settings) ?? TODO_STATE.symbol;
    return {
        current: currentSymbol,
        next,
    };
}

export function splitTemplate(template: string): { prefix: string; format: string; suffix: string } {
    if (hasTimePlaceholder(template)) {
        const index = template.indexOf('{{time}}');
        return {
            prefix: template.slice(0, index),
            format: '',
            suffix: template.slice(index + '{{time}}'.length),
        };
    }
    const implicitMatch = template.match(/^(.*::\s*)(\]|\)\s*)$/u);
    if (implicitMatch !== null) {
        return {
            prefix: implicitMatch[1],
            format: '',
            suffix: implicitMatch[2].trimEnd(),
        };
    }
    const start = template.search(/YY/);
    if (start === -1) {
        return { prefix: template, format: '', suffix: '' };
    }
    let end = start;
    while (end < template.length && /[A-Za-z0-9:/\-+. TZ]/.test(template[end])) {
        end++;
    }
    return {
        prefix: template.slice(0, start),
        format: template.slice(start, end),
        suffix: template.slice(end),
    };
}

export function hasTimePlaceholder(template: string): boolean {
    return template.includes('{{time}}');
}

export function formatFieldNow(template: string, now: Moment, settings: Settings): string {
    if (hasTimePlaceholder(template)) {
        return template.replace('{{time}}', now.format(getTimeFormat(settings)));
    }
    return template;
}

export function formatFieldWithValue(template: string, value: string): string {
    if (hasTimePlaceholder(template)) {
        return template.replace('{{time}}', value);
    }
    return template;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatToValuePattern(format: string): string {
    if (format.length === 0) {
        return '[^\\]\\n]*';
    }
    let pattern = '';
    let i = 0;
    while (i < format.length) {
        const rest = format.slice(i);
        let token = '';
        if (rest.startsWith('YYYY')) {
            token = 'YYYY';
        } else if (rest.startsWith('YY')) {
            token = 'YY';
        } else if (rest.startsWith('MM')) {
            token = 'MM';
        } else if (rest.startsWith('DD')) {
            token = 'DD';
        } else if (rest.startsWith('HH')) {
            token = 'HH';
        } else if (rest.startsWith('mm')) {
            token = 'mm';
        } else if (rest.startsWith('ss')) {
            token = 'ss';
        } else if (rest.startsWith('ZZ')) {
            token = 'ZZ';
        } else if (rest.startsWith('Z')) {
            token = 'Z';
        }

        if (token.length > 0) {
            if (token === 'YYYY') {
                pattern += '\\d{4}';
            } else if (token === 'ZZ') {
                pattern += '[+-]\\d{2}:?\\d{2}';
            } else if (token === 'Z') {
                pattern += '(?:[+-]\\d{2}:?\\d{2}|Z)';
            } else {
                pattern += '\\d{2}';
            }
            i += token.length;
        } else {
            pattern += escapeRegExp(format[i]);
            i++;
        }
    }
    return pattern;
}

export function fieldRemovalRegex(template: string): RegExp {
    const { prefix, format, suffix } = splitTemplate(template);
    const genericValue =
        '\\d{4}[-/]\\d{2}[-/]\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2})?(?:[+-]\\d{2}:?\\d{2}|Z)?)?';
    const value =
        format.length > 0
            ? formatToValuePattern(format)
            : hasTimePlaceholder(template)
              ? genericValue
              : '';
    return new RegExp(
        `\\s*${escapeRegExp(prefix)}${value ? `\\s*${value}` : ''}${escapeRegExp(suffix)}`,
        'u',
    );
}

export function removeFieldFromBody(
    body: string,
    template: string,
): { body: string; raw: string | null } {
    const regex = fieldRemovalRegex(template);
    const match = body.match(regex);
    if (match === null) {
        return { body, raw: null };
    }
    const raw = match[0].trim();
    return { body: body.replace(regex, '').trim(), raw };
}
