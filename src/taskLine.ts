import type { Moment } from 'moment';
import { getTimeFormat, type Settings } from './settings';

export interface TimestampField {
    value: string;
}

export interface ParsedTaskLine {
    indentation: string;
    listMarker: string;
    statusSymbol: string;
    description: string;
    created?: TimestampField;
    done?: TimestampField;
    cancelled?: TimestampField;
    fieldFormat: 'dataview' | 'emoji' | null;
}

export interface EditedTaskLineInput {
    description: string;
    statusSymbol: string;
    settings: Settings;
    now?: Moment;
}

const TASK_LINE_REGEX = /^([ \t>]*)([-*+]|[0-9]+[.)]) +\[(.)\] *(.*)$/u;
const LIST_ITEM_REGEX = /^([ \t>]*)([-*+]|[0-9]+[.)]) +(.+)$/u;

const NEXT_STATUS: Record<string, string> = {
    ' ': 'x',
    x: ' ',
    '/': 'x',
    '-': ' ',
};

const PRESET_TIMESTAMP_PATTERNS: RegExp[] = [
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2}:\d{2}|Z)?$/,
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    /^\d{4}-\d{2}-\d{2}$/,
];

function nowMoment(): Moment {
    return (window as any).moment();
}

function isTimestampLike(value: string, timeFormat: string): boolean {
    if (PRESET_TIMESTAMP_PATTERNS.some((pattern) => pattern.test(value))) {
        return true;
    }
    try {
        return (window as any).moment(value, timeFormat, true).isValid();
    } catch {
        return false;
    }
}

function matchLastEmojiField(
    work: string,
    timeFormat: string,
): { start: number; symbol: string; value: string } | null {
    let best: { index: number; symbol: string } | null = null;
    for (const symbol of ['❌', '✅', '➕']) {
        const index = work.lastIndexOf(symbol);
        if (index !== -1 && (best === null || index > best.index)) {
            best = { index, symbol };
        }
    }
    if (best === null) {
        return null;
    }

    let valueStart = best.index + best.symbol.length;
    if (work[valueStart] === '\uFE0F') {
        valueStart++;
    }
    const value = work.slice(valueStart).trim();
    if (!isTimestampLike(value, timeFormat)) {
        return null;
    }

    let start = best.index;
    while (start > 0 && /\s/.test(work[start - 1])) {
        start--;
    }
    return { start, symbol: best.symbol, value };
}

export function parseTaskLine(line: string, timeFormat?: string): ParsedTaskLine | null {
    const match = line.match(TASK_LINE_REGEX);
    if (match === null) {
        return null;
    }

    const indentation = match[1];
    const listMarker = match[2];
    const statusSymbol = match[3];
    let work = match[4].trim();
    const effectiveTimeFormat = timeFormat ?? 'YYYY-MM-DDTHH:mm:ssZ';

    let created: TimestampField | undefined;
    let done: TimestampField | undefined;
    let cancelled: TimestampField | undefined;
    let fieldFormat: 'dataview' | 'emoji' | null = null;

    const dataviewFields: Array<{ key: 'created' | 'done' | 'cancelled'; fieldName: string }> = [
        { key: 'created', fieldName: 'created' },
        { key: 'done', fieldName: 'completion' },
        { key: 'cancelled', fieldName: 'cancelled' },
    ];

    for (let i = 0; i < 10; i++) {
        let matched = false;

        for (const field of dataviewFields) {
            const bracketRegex = new RegExp(`\\s*\\[${field.fieldName}:: *([^\\]]*)\\] *,?$`, 'u');
            const bracketMatch = work.match(bracketRegex);
            if (bracketMatch !== null) {
                if (fieldFormat === null) {
                    fieldFormat = 'dataview';
                }
                if (field.key === 'created') {
                    created = { value: bracketMatch[1].trim() };
                } else if (field.key === 'done') {
                    done = { value: bracketMatch[1].trim() };
                } else {
                    cancelled = { value: bracketMatch[1].trim() };
                }
                work = work.replace(bracketRegex, '').trim();
                matched = true;
                continue;
            }

            const parenRegex = new RegExp(`\\s*\\(${field.fieldName}:: *([^)]*)\\) *,?$`, 'u');
            const parenMatch = work.match(parenRegex);
            if (parenMatch !== null) {
                if (fieldFormat === null) {
                    fieldFormat = 'dataview';
                }
                if (field.key === 'created') {
                    created = { value: parenMatch[1].trim() };
                } else if (field.key === 'done') {
                    done = { value: parenMatch[1].trim() };
                } else {
                    cancelled = { value: parenMatch[1].trim() };
                }
                work = work.replace(parenRegex, '').trim();
                matched = true;
            }
        }

        const emojiField = matchLastEmojiField(work, effectiveTimeFormat);
        if (emojiField !== null) {
            if (fieldFormat === null) {
                fieldFormat = 'emoji';
            }
            if (emojiField.symbol === '➕') {
                created ??= { value: emojiField.value };
            } else if (emojiField.symbol === '✅') {
                done ??= { value: emojiField.value };
            } else {
                cancelled ??= { value: emojiField.value };
            }
            work = work.slice(0, emojiField.start).trim();
            matched = true;
        }

        if (!matched) {
            break;
        }
    }

    return {
        indentation,
        listMarker,
        statusSymbol,
        description: work,
        created,
        done,
        cancelled,
        fieldFormat,
    };
}

export function stripListPrefix(line: string): string {
    const match = line.match(/^[ \t>]*(?:[-*+]|[0-9]+[.)]) +(.*)$/u);
    return match === null ? line : match[1];
}

export function makeField(
    kind: 'created' | 'done' | 'cancelled',
    value: string,
    format: 'dataview' | 'emoji',
): string {
    if (format === 'dataview') {
        const key = kind === 'created' ? 'created' : kind === 'done' ? 'completion' : 'cancelled';
        return `  [${key}:: ${value}]`;
    }
    const symbol = kind === 'created' ? '➕' : kind === 'done' ? '✅' : '❌';
    return ` ${symbol} ${value}`;
}

export function formatTimestamp(settings: Settings, now: Moment = nowMoment()): string {
    return now.format(getTimeFormat(settings));
}

function effectiveFieldFormat(parsed: ParsedTaskLine, settings: Settings): 'dataview' | 'emoji' {
    return parsed.fieldFormat ?? settings.taskFormat;
}

function buildLine(
    parsed: ParsedTaskLine,
    statusSymbol: string,
    description: string,
    fieldTexts: string[],
): string {
    return `${parsed.indentation}${parsed.listMarker} [${statusSymbol}] ${description}${fieldTexts.join('')}`;
}

export function toggleTaskLine(
    line: string,
    settings: Settings,
    now: Moment = nowMoment(),
): string | null {
    const parsed = parseTaskLine(line, getTimeFormat(settings));
    if (parsed === null) {
        return null;
    }
    const nextStatus = NEXT_STATUS[parsed.statusSymbol];
    if (nextStatus === undefined) {
        return null;
    }

    const format = effectiveFieldFormat(parsed, settings);
    const fields: string[] = [];
    if (parsed.created !== undefined) {
        fields.push(makeField('created', parsed.created.value, format));
    }
    if (nextStatus === 'x' && settings.setDoneDate) {
        fields.push(makeField('done', formatTimestamp(settings, now), format));
    }
    if (nextStatus === '-' && settings.setCancelledDate) {
        fields.push(makeField('cancelled', formatTimestamp(settings, now), format));
    }
    return buildLine(parsed, nextStatus, parsed.description, fields);
}

export function enrichToggledLine(
    line: string,
    settings: Settings,
    now: Moment = nowMoment(),
): string {
    const parsed = parseTaskLine(line, getTimeFormat(settings));
    if (parsed === null) {
        return line;
    }

    const format = effectiveFieldFormat(parsed, settings);
    const fields: string[] = [];

    if (parsed.created !== undefined) {
        fields.push(makeField('created', parsed.created.value, format));
    }
    if (parsed.statusSymbol === 'x') {
        const doneValue =
            parsed.done?.value ??
            (settings.setDoneDate ? formatTimestamp(settings, now) : undefined);
        if (doneValue !== undefined) {
            fields.push(makeField('done', doneValue, format));
        }
    }
    if (parsed.statusSymbol === '-') {
        const cancelledValue =
            parsed.cancelled?.value ??
            (settings.setCancelledDate ? formatTimestamp(settings, now) : undefined);
        if (cancelledValue !== undefined) {
            fields.push(makeField('cancelled', cancelledValue, format));
        }
    }

    return buildLine(parsed, parsed.statusSymbol, parsed.description, fields);
}

export function buildEditedLine(parsed: ParsedTaskLine, input: EditedTaskLineInput): string {
    const now = input.now ?? nowMoment();
    const format = effectiveFieldFormat(parsed, input.settings);
    const fields: string[] = [];

    const createdValue =
        parsed.created?.value ??
        (input.settings.setCreatedDate ? formatTimestamp(input.settings, now) : undefined);
    if (createdValue !== undefined) {
        fields.push(makeField('created', createdValue, format));
    }

    if (input.statusSymbol === 'x') {
        const doneValue =
            parsed.done?.value ??
            (input.settings.setDoneDate ? formatTimestamp(input.settings, now) : undefined);
        if (doneValue !== undefined) {
            fields.push(makeField('done', doneValue, format));
        }
    }

    if (input.statusSymbol === '-') {
        const cancelledValue =
            parsed.cancelled?.value ??
            (input.settings.setCancelledDate ? formatTimestamp(input.settings, now) : undefined);
        if (cancelledValue !== undefined) {
            fields.push(makeField('cancelled', cancelledValue, format));
        }
    }

    return buildLine(parsed, input.statusSymbol, input.description.trim(), fields);
}

export function createTaskLine(
    originalLine: string,
    description: string,
    statusSymbol: string,
    settings: Settings,
    now: Moment = nowMoment(),
): string {
    const listMatch = originalLine.match(LIST_ITEM_REGEX);
    const indentation = listMatch === null ? '' : listMatch[1];
    const marker = listMatch === null ? '-' : listMatch[2];
    const fields: string[] = [];

    if (settings.setCreatedDate) {
        fields.push(makeField('created', formatTimestamp(settings, now), settings.taskFormat));
    }
    if (statusSymbol === 'x' && settings.setDoneDate) {
        fields.push(makeField('done', formatTimestamp(settings, now), settings.taskFormat));
    }
    if (statusSymbol === '-' && settings.setCancelledDate) {
        fields.push(makeField('cancelled', formatTimestamp(settings, now), settings.taskFormat));
    }

    return `${indentation}${marker} [${statusSymbol}] ${description.trim()}${fields.join('')}`;
}
