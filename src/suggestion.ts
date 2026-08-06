import { getTimeFormat, type Settings } from './settings';
import { formatTimestamp, makeField, parseTaskLine } from './taskLine';

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

    const prefix = `${parsed.indentation}${parsed.listMarker} [${parsed.statusSymbol}] `;
    if (cursorCh < prefix.length) {
        return [];
    }

    const beforeCursor = line.slice(0, cursorCh);
    const trigger = settings.suggestTrigger;
    if (trigger.length === 0 || !beforeCursor.endsWith(trigger)) {
        return [];
    }

    const valueText = formatTimestamp(settings);
    const field = makeField('created', valueText, settings.taskFormat);
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
