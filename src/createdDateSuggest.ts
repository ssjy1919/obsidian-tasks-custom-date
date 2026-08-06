import {
    App,
    Editor,
    EditorPosition,
    EditorSuggest,
    EditorSuggestContext,
    EditorSuggestTriggerInfo,
    TFile,
} from 'obsidian';
import { i18n } from './i18n/i18n';
import { getSettings } from './settings';
import { buildCreatedDateSuggestions, type CreatedDateSuggestionData } from './suggestion';

interface CreatedDateSuggestionValue extends CreatedDateSuggestionData {
    context: EditorSuggestContext;
}

export class CreatedDateSuggest extends EditorSuggest<CreatedDateSuggestionValue> {
    constructor(app: App) {
        super(app);
    }

    public onTrigger(
        cursor: EditorPosition,
        editor: Editor,
        _file: TFile,
    ): EditorSuggestTriggerInfo | null {
        const line = editor.getLine(cursor.line);
        const settings = getSettings();
        const suggestions = buildCreatedDateSuggestions(
            line,
            cursor.ch,
            settings,
            i18n.t('suggest.created'),
            '⏎',
        );
        if (suggestions.length === 0) {
            return null;
        }
        return {
            start: { line: cursor.line, ch: 0 },
            end: { line: cursor.line, ch: line.length },
            query: line,
        };
    }

    public getSuggestions(context: EditorSuggestContext): CreatedDateSuggestionValue[] {
        const cursor = context.editor.getCursor();
        const settings = getSettings();
        const suggestions = buildCreatedDateSuggestions(
            context.query,
            cursor.ch,
            settings,
            i18n.t('suggest.created'),
            '⏎',
        );
        return suggestions.map((suggestion) => ({ ...suggestion, context }));
    }

    public renderSuggestion(value: CreatedDateSuggestionValue, el: HTMLElement): void {
        el.setText(value.displayText);
    }

    public selectSuggestion(value: CreatedDateSuggestionValue, _evt: MouseEvent | KeyboardEvent): void {
        const editor = value.context.editor;
        if (value.kind === 'empty') {
            this.close();
            const contentDOM = (editor as any)?.cm?.contentDOM;
            if (contentDOM !== undefined && contentDOM !== null) {
                contentDOM.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' }));
            }
            return;
        }

        const cursor = editor.getCursor();
        editor.replaceRange(
            value.appendText,
            { line: cursor.line, ch: value.replaceFrom },
            { line: cursor.line, ch: value.replaceTo },
        );
        editor.setCursor({ line: cursor.line, ch: value.replaceFrom + value.appendText.length });
    }
}
