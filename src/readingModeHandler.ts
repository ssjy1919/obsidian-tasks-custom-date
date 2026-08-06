import { MarkdownView, Plugin, TFile } from 'obsidian';
import { getSettings, getTimeFormat } from './settings';
import { enrichToggledLine, parseTaskLine } from './taskLine';

export class ReadingModeHandler {
    private readonly plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.registerDomEvent(document, 'click', (event) => this.handleClick(event));
    }

    private handleClick(event: MouseEvent): void {
        const target = event.target;
        if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
            return;
        }

        const preview = target.closest('.markdown-preview-view');
        if (preview === null) {
            return;
        }

        const listItem = target.closest('.task-list-item');
        if (listItem === null) {
            return;
        }

        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (view === null || view.file === null) {
            return;
        }

        const items = Array.from(preview.querySelectorAll('.task-list-item'));
        const taskIndex = items.indexOf(listItem);
        if (taskIndex < 0) {
            return;
        }

        void this.enrichAfterToggle(view.file, taskIndex);
    }

    private async enrichAfterToggle(file: TFile, taskIndex: number): Promise<void> {
        for (let attempt = 0; attempt < 5; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 120));
            try {
                const data = await this.plugin.app.vault.read(file);
                const lines = data.split('\n');
                const timeFormat = getTimeFormat(getSettings());

                let currentTaskIndex = 0;
                let lineNumber: number | undefined;
                let current: string | undefined;
                for (let i = 0; i < lines.length; i++) {
                    if (parseTaskLine(lines[i], timeFormat) === null) {
                        continue;
                    }
                    if (currentTaskIndex === taskIndex) {
                        lineNumber = i;
                        current = lines[i];
                        break;
                    }
                    currentTaskIndex++;
                }

                if (lineNumber === undefined || current === undefined) {
                    continue;
                }

                const enriched = enrichToggledLine(current, getSettings());
                if (enriched === current) {
                    continue;
                }

                await this.plugin.app.vault.process(file, (dataToEdit) => {
                    const linesToEdit = dataToEdit.split('\n');
                    if (linesToEdit[lineNumber!] !== current) {
                        return dataToEdit;
                    }
                    linesToEdit[lineNumber!] = enriched;
                    return linesToEdit.join('\n');
                });
                return;
            } catch (error) {
                console.error('Tasks custom date: failed to enrich reading-mode toggle', error);
                return;
            }
        }
    }
}
