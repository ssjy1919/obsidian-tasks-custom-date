import type { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type PluginValue } from '@codemirror/view';
import { getSettings, getTimeFormat } from './settings';
import { enrichToggledLine, parseTaskLine, toggleTaskLine } from './taskLine';
import { getStateBySymbol, shouldCycle, shouldIntercept } from './stateEngine';

class LivePreviewExtension implements PluginValue {
    private readonly view: EditorView;

    constructor(view: EditorView) {
        this.view = view;
        this.handleClickEvent = this.handleClickEvent.bind(this);
        this.view.dom.addEventListener('click', this.handleClickEvent, true);
    }

    public destroy(): void {
        this.view.dom.removeEventListener('click', this.handleClickEvent, true);
    }

    private handleClickEvent(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
            return;
        }
        if (target.closest('div.callout-content') !== null) {
            return;
        }

        let originalFrom: number | null = null;
        let originalText: string | null = null;
        try {
            const position = this.view.posAtDOM(target);
            const line = this.view.state.doc.lineAt(position);
            originalFrom = line.from;
            originalText = line.text;
        } catch {
            return;
        }
        if (originalFrom === null || originalText === null) {
            return;
        }

        const settings = getSettings();
        const parsed = parseTaskLine(originalText, getTimeFormat(settings));
        const unknownState =
            parsed !== null && getStateBySymbol(settings, parsed.statusSymbol) === undefined;
        if (shouldCycle(originalText, settings) || (shouldIntercept(originalText, settings) && unknownState)) {
            event.preventDefault();
            const toggled = toggleTaskLine(originalText, settings);
            if (toggled !== null && toggled !== originalText) {
                const transaction = this.view.state.update({
                    changes: {
                        from: originalFrom,
                        to: originalFrom + originalText.length,
                        insert: toggled,
                    },
                });
                this.view.dispatch(transaction);
                const match = toggled.match(/\[(.)\]/u);
                const checked = match !== null && match[1] !== ' ';
                setTimeout(() => {
                    target.checked = checked;
                }, 1);
            }
            return;
        }

        // Obsidian toggles the checkbox natively; enrich the line afterwards.
        setTimeout(() => {
            void this.enrichLine(originalFrom!, originalText!);
        }, 100);
    }

    private async enrichLine(originalFrom: number, originalText: string): Promise<void> {
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                const currentState = this.view.state;
                const currentLine = currentState.doc.lineAt(originalFrom);
                const enriched = enrichToggledLine(currentLine.text, getSettings());
                if (enriched !== currentLine.text) {
                    const transaction = currentState.update({
                        changes: {
                            from: currentLine.from,
                            to: currentLine.to,
                            insert: enriched,
                        },
                    });
                    this.view.dispatch(transaction);
                    return;
                }
                if (currentLine.text !== originalText) {
                    return;
                }
            } catch {
                return;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }
}

export const newLivePreviewExtension = (): Extension =>
    ViewPlugin.fromClass<LivePreviewExtension, undefined>(LivePreviewExtension);
