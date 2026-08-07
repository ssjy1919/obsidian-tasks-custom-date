import { getTimeFormat, type Settings } from './settings';
import { parseTaskLine } from './taskLine';
import {
    TODO_STATE,
    formatFieldNow,
    getStateBySymbol,
    hasTimePlaceholder,
    shouldIntercept,
    splitTemplate,
} from './stateEngine';

export type CreatedDateSuggestionKind = 'created' | 'empty';

export interface CreatedDateSuggestionData {
    kind: CreatedDateSuggestionKind;
    replaceFrom: number;
    replaceTo: number;
    appendText: string;
    displayText: string;
}

export function buildCreatedDateSuggestions(
    line: string,
    cursorCh: number,
    settings: Settings,
    displayLabel: string,
    emptyLabel: string,
): CreatedDateSuggestionData[] {
    const parsed = parseTaskLine(line, getTimeFormat(settings));
    if (parsed === null || parsed.created !== undefined) {
        return [];
    }
    if (!shouldIntercept(line, settings)) {
        return [];
    }

    const prefix = `${parsed.indentation}${parsed.listMarker} [${parsed.statusSymbol}] `;
    if (cursorCh < prefix.length) {
        return [];
    }

    const beforeCursor = line.slice(0, cursorCh);
    const trigger = settings.suggestTrigger;
    if (trigger.length === 0 || !beforeCursor.endsWith(trigger)) {
        return [];
    }

    const now = (window as any).moment();
    const todoState = getStateBySymbol(settings, TODO_STATE.symbol) ?? TODO_STATE;
    if (!hasTimePlaceholder(todoState.format)) {
        return [];
    }
    const { format } = splitTemplate(todoState.format);
    const valueText = format.length > 0 ? now.format(format) : now.format(getTimeFormat(settings));
    const field = formatFieldNow(todoState.format, now, settings);
    const appendText = trigger === ' ' ? field.trimStart() : ` ${field.trimStart()}`;
    const createdSuggestion: CreatedDateSuggestionData = {
        kind: 'created',
        replaceFrom: cursorCh,
        replaceTo: cursorCh,
        appendText,
        displayText: `${displayLabel}: ${valueText}`,
    };
    const emptySuggestion: CreatedDateSuggestionData = {
        kind: 'empty',
        replaceFrom: cursorCh,
        replaceTo: cursorCh,
        appendText: '',
        displayText: emptyLabel,
    };

    return [createdSuggestion, emptySuggestion];
}
