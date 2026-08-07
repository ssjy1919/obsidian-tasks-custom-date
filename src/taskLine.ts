import type { Moment } from 'moment';
import { getTimeFormat, type Settings, type TaskStateConfig } from './settings';
import {
    DONE_STATE,
    TODO_STATE,
    formatFieldNow,
    formatFieldWithValue,
    getStateBySymbol,
    getStateSequence,
    nextStatusSymbol,
    removeFieldFromBody,
    shouldIntercept,
} from './stateEngine';

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

export function normalizeTaskLine(
    line: string,
    settings: Settings,
    now: Moment = nowMoment(),
): string | null {
    if (!shouldIntercept(line, settings)) {
        return line;
    }
    const parsed = parseTaskLine(line, getTimeFormat(settings));
    if (parsed === null) {
        return null;
    }

    const sequence = getStateSequence(settings);
    const todoState = sequence.find((state) => state.id === TODO_STATE.id) ?? TODO_STATE;
    const doneState = sequence.find((state) => state.id === DONE_STATE.id) ?? DONE_STATE;
    let description = parsed.description;
    const rawFields: Array<{ state: TaskStateConfig; raw: string }> = [];

    for (let i = 0; i < sequence.length * 3; i++) {
        let removedAny = false;
        for (const state of sequence) {
            const removed = removeFieldFromBody(description, state.format);
            if (removed.raw !== null) {
                rawFields.push({ state, raw: removed.raw });
                description = removed.body;
                removedAny = true;
            }
        }
        if (!removedAny) {
            break;
        }
    }

    if (parsed.created !== undefined && !rawFields.some((r) => r.state.id === todoState.id)) {
        rawFields.push({ state: todoState, raw: formatFieldWithValue(todoState.format, parsed.created.value) });
    }
    if (parsed.done !== undefined && !rawFields.some((r) => r.state.id === doneState.id)) {
        rawFields.push({ state: doneState, raw: formatFieldWithValue(doneState.format, parsed.done.value) });
    }
    if (parsed.cancelled !== undefined) {
        const cancelledState = sequence.find((state) => state.symbol === '-');
        if (
            cancelledState !== undefined &&
            !rawFields.some((r) => r.state.id === cancelledState.id)
        ) {
            rawFields.push({
                state: cancelledState,
                raw: formatFieldWithValue(cancelledState.format, parsed.cancelled.value),
            });
        }
    }

    const fields: string[] = [];
    const todoRaw = rawFields.find((r) => r.state.id === todoState.id);
    if (todoRaw !== undefined) {
        fields.push(todoRaw.raw);
    } else if (parsed.statusSymbol === todoState.symbol || settings.alwaysWriteCreated) {
        fields.push(formatFieldNow(todoState.format, now, settings));
    }

    for (const state of sequence) {
        if (state.symbol === TODO_STATE.symbol) {
            continue;
        }
        if (state.symbol !== parsed.statusSymbol) {
            continue;
        }
        const existing = rawFields.find((r) => r.state.id === state.id);
        fields.push(
            existing !== undefined ? existing.raw : formatFieldNow(state.format, now, settings),
        );
    }

    const fieldText = fields.map((f) => (f.startsWith(' ') ? f : ` ${f}`)).join('');
    return `${parsed.indentation}${parsed.listMarker} [${parsed.statusSymbol}] ${description}${fieldText}`;
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
    const nextStatus = nextStatusSymbol(parsed.statusSymbol, line, settings);
    if (nextStatus === null) {
        return null;
    }
    const statusChangedLine = line.replace(TASK_LINE_REGEX, `$1$2 [${nextStatus}] $4`);
    if (!shouldIntercept(line, settings)) {
        return statusChangedLine;
    }
    return normalizeTaskLine(statusChangedLine, settings, now) ?? statusChangedLine;
}

export function enrichToggledLine(
    line: string,
    settings: Settings,
    now: Moment = nowMoment(),
): string {
    if (!shouldIntercept(line, settings)) {
        return line;
    }
    return normalizeTaskLine(line, settings, now) ?? line;
}

export function buildEditedLine(parsed: ParsedTaskLine, input: EditedTaskLineInput): string {
    const now = input.now ?? nowMoment();
    const todoState = getStateBySymbol(input.settings, TODO_STATE.symbol) ?? TODO_STATE;
    const doneState = getStateBySymbol(input.settings, DONE_STATE.symbol) ?? DONE_STATE;
    const fields: string[] = [];
    if (parsed.created !== undefined) {
        fields.push(formatFieldWithValue(todoState.format, parsed.created.value));
    }
    if (parsed.done !== undefined) {
        fields.push(formatFieldWithValue(doneState.format, parsed.done.value));
    }
    if (parsed.cancelled !== undefined) {
        const cancelledState = getStateBySymbol(input.settings, '-');
        if (cancelledState !== undefined) {
            fields.push(formatFieldWithValue(cancelledState.format, parsed.cancelled.value));
        }
    }
    const tail = fields.map((f) => (f.startsWith(' ') ? f : ` ${f}`)).join('');
    const line = `${parsed.indentation}${parsed.listMarker} [${input.statusSymbol}] ${input.description.trim()}${tail}`;
    if (!shouldIntercept(line, input.settings)) {
        return line;
    }
    return normalizeTaskLine(line, input.settings, now) ?? line;
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
    const todoState = getStateBySymbol(settings, TODO_STATE.symbol) ?? TODO_STATE;
    const fields: string[] = [];

    if (shouldIntercept(originalLine, settings)) {
        if (statusSymbol === todoState.symbol) {
            fields.push(formatFieldNow(todoState.format, now, settings));
        }
        const state = getStateBySymbol(settings, statusSymbol);
        if (state !== undefined && state.symbol !== TODO_STATE.symbol) {
            fields.push(formatFieldNow(state.format, now, settings));
        }
    }

    const fieldText = fields.map((f) => (f.startsWith(' ') ? f : ` ${f}`)).join('');
    return `${indentation}${marker} [${statusSymbol}] ${description.trim()}${fieldText}`;
}
