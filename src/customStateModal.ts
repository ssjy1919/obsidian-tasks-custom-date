import { App, Modal, Notice, Setting, TextComponent } from 'obsidian';
import { getSettings, type TaskStateConfig } from './settings';
import { i18n } from './i18n/i18n';
import { DONE_STATE, TODO_STATE, formatFieldNow } from './stateEngine';

export class CustomStateModal extends Modal {
    public readonly state: TaskStateConfig;
    public saved = false;
    private readonly existingSymbols: string[];
    private readonly isBase: boolean;
    private previewEl: HTMLElement | null = null;

    constructor(app: App, state: TaskStateConfig, existingSymbols: string[], isBase = false) {
        super(app);
        this.state = { ...state };
        this.existingSymbols = existingSymbols;
        this.isBase = isBase;
    }

    public onOpen(): void {
        this.display();
    }

    public onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    private display(): void {
        const { contentEl } = this;
        contentEl.empty();
        this.titleEl.setText(i18n.t('modals.customState.title'));

        let symbolText: TextComponent | undefined;
        new Setting(contentEl)
            .setName(i18n.t('modals.customState.symbol.name'))
            .addText((text) => {
                symbolText = text;
                text.setValue(this.state.symbol).onChange((value) => {
                    this.state.symbol = value;
                    CustomStateModal.setValid(text, this.validateSymbol(value));
                });
                if (this.isBase) {
                    text.inputEl.disabled = true;
                }
            })
            .then(() => {
                if (symbolText !== undefined) {
                    CustomStateModal.setValid(symbolText, this.validateSymbol(this.state.symbol));
                }
            });

        new Setting(contentEl)
            .setName(i18n.t('modals.customState.name.name'))
            .addText((text) => {
                text.setValue(this.state.name).onChange((value) => {
                    this.state.name = value;
                });
                if (this.isBase) {
                    text.inputEl.disabled = true;
                }
            });

        new Setting(contentEl)
            .setName(i18n.t('modals.customState.format.name'))
            .setDesc(i18n.t('modals.customState.format.desc'))
            .addText((text) => {
                text.setValue(this.state.format).onChange((value) => {
                    this.state.format = value;
                    this.previewEl?.setText(this.previewText());
                });
                text.inputEl.addEventListener('blur', () => {
                    if (text.getValue().trim().length === 0) {
                        const fallback = this.defaultFormat();
                        text.setValue(fallback);
                        this.state.format = fallback;
                        this.previewEl?.setText(this.previewText());
                    }
                });
            });

        const preview = contentEl.createDiv();
        preview.addClass('setting-item-description');
        preview.setText(this.previewText());
        this.previewEl = preview;

        new Setting(contentEl)
            .addButton((button) =>
                button.setButtonText(i18n.t('modal.save')).setCta().onClick(() => {
                    const errors = this.validate();
                    if (errors.length > 0) {
                        new Notice(errors.join('\n'));
                        return;
                    }
                    this.saved = true;
                    this.close();
                }),
            )
            .addButton((button) =>
                button.setButtonText(i18n.t('modal.cancel')).onClick(() => {
                    this.saved = false;
                    this.close();
                }),
            );
    }

    private validateSymbol(symbol: string): string[] {
        if (this.isBase) {
            return [];
        }
        const errors: string[] = [];
        if (symbol.trim().length === 0) {
            errors.push(i18n.t('modals.customState.errors.symbolRequired'));
        } else if (this.existingSymbols.includes(symbol)) {
            errors.push(i18n.t('modals.customState.errors.symbolDuplicate'));
        }
        return errors;
    }

    private validate(): string[] {
        if (this.isBase) {
            return [];
        }
        const errors = this.validateSymbol(this.state.symbol);
        if (this.state.name.trim().length === 0) {
            errors.push(i18n.t('modals.customState.errors.nameRequired'));
        }
        return errors;
    }

    private previewText(): string {
        return formatFieldNow(this.state.format, (window as any).moment(), getSettings());
    }

    private defaultFormat(): string {
        if (this.isBase && this.state.id === TODO_STATE.id) {
            return ' [created:: {{time}}]';
        }
        if (this.isBase && this.state.id === DONE_STATE.id) {
            return ' [completion:: {{time}}]';
        }
        return ' [state:: {{time}}]';
    }

    private static setValid(text: TextComponent, errors: string[]): void {
        if (errors.length === 0) {
            text.inputEl.removeClass('tasks-settings-is-invalid');
        } else {
            text.inputEl.addClass('tasks-settings-is-invalid');
        }
    }
}
