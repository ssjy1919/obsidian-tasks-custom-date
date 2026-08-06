import { App, Editor, Modal, Setting } from 'obsidian';
import { i18n } from './i18n/i18n';
import { getSettings, getTimeFormat } from './settings';
import { buildEditedLine, createTaskLine, parseTaskLine, stripListPrefix } from './taskLine';

export class CreateOrEditTaskModal extends Modal {
    private readonly editor: Editor;
    private readonly lineNumber: number;
    private readonly originalLine: string;
    private description: string;
    private statusSymbol: string;

    constructor(app: App, editor: Editor, lineNumber: number, originalLine: string) {
        super(app);
        this.editor = editor;
        this.lineNumber = lineNumber;
        this.originalLine = originalLine;

        const parsed = parseTaskLine(originalLine, getTimeFormat(getSettings()));
        this.statusSymbol = parsed?.statusSymbol ?? ' ';
        this.description = parsed !== null ? parsed.description : stripListPrefix(originalLine);
    }

    public onOpen(): void {
        const { contentEl } = this;
        this.titleEl.setText(i18n.t('modal.title'));

        new Setting(contentEl)
            .setName(i18n.t('modal.description'))
            .addText((text) => {
                text.setValue(this.description).onChange((value) => {
                    this.description = value;
                });
            });

        new Setting(contentEl)
            .setName(i18n.t('modal.status'))
            .addDropdown((dropdown) => {
                dropdown
                    .addOption(' ', i18n.t('status.todo'))
                    .addOption('/', i18n.t('status.inProgress'))
                    .addOption('x', i18n.t('status.done'))
                    .addOption('-', i18n.t('status.cancelled'))
                    .setValue(this.statusSymbol)
                    .onChange((value) => {
                        this.statusSymbol = value;
                    });
            });

        new Setting(contentEl).addButton((button) =>
            button.setButtonText(i18n.t('modal.save')).setCta().onClick(() => {
                this.save();
            }),
        );
    }

    public onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }

    private save(): void {
        const settings = getSettings();
        const parsed = parseTaskLine(this.originalLine, getTimeFormat(settings));
        const replacement =
            parsed !== null
                ? buildEditedLine(parsed, {
                      description: this.description,
                      statusSymbol: this.statusSymbol,
                      settings,
                  })
                : createTaskLine(this.originalLine, this.description, this.statusSymbol, settings);
        this.editor.setLine(this.lineNumber, replacement);
        this.close();
    }
}
