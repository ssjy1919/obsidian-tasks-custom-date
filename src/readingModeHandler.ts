import { MarkdownView, Plugin, TFile } from 'obsidian';
import { getSettings, getTimeFormat } from './settings';
import { parseTaskLine, toggleTaskLine } from './taskLine';

export class ReadingModeHandler {
    private readonly plugin: Plugin;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.plugin.registerDomEvent(document, 'click', (event) => this.handleClick(event), true);
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

        event.preventDefault();
        event.stopPropagation();
        const originalChecked = target.checked;
        target.disabled = true;
        void this.toggleTask(view.file, taskIndex, target, originalChecked);
    }

    private async toggleTask(
        file: TFile,
        taskIndex: number,
        checkbox: HTMLInputElement,
        originalChecked: boolean,
    ): Promise<void> {
        for (let attempt = 0; attempt < 5; attempt++) {
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
                    await new Promise((resolve) => setTimeout(resolve, 120));
                    continue;
                }

                const toggled = toggleTaskLine(current, getSettings());
                if (toggled === null || toggled === current) {
                    await new Promise((resolve) => setTimeout(resolve, 120));
                    continue;
                }

                await this.plugin.app.vault.process(file, (dataToEdit) => {
                    const linesToEdit = dataToEdit.split('\n');
                    if (linesToEdit[lineNumber!] !== current) {
                        return dataToEdit;
                    }
                    linesToEdit[lineNumber!] = toggled;
                    return linesToEdit.join('\n');
                });

                this.syncCheckbox(checkbox, toggled);
                return;
            } catch (error) {
                console.error('Tasks custom date: failed to toggle task in reading mode', error);
                break;
            }
        }
        checkbox.disabled = false;
        checkbox.checked = originalChecked;
    }

    private syncCheckbox(checkbox: HTMLInputElement, toggledLine: string): void {
        const match = toggledLine.match(/\[(.)\]/u);
        const checked = match !== null && match[1] !== ' ';
        setTimeout(() => {
            if (checkbox.isConnected) {
                checkbox.checked = checked;
                checkbox.disabled = false;
            }
        }, 100);
    }
}
