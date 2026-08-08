import { Plugin, type Editor } from 'obsidian';
import { CreatedDateSuggest } from './createdDateSuggest';
import { CreateOrEditTaskModal } from './createOrEditModal';
import { i18n, initializeI18n } from './i18n/i18n';
import { newLivePreviewExtension } from './livePreviewExtension';
import { ReadingModeHandler } from './readingModeHandler';
import { DEFAULT_SETTINGS, getSettings, getTimeFormat, updateSettings } from './settings';
import { TasksCustomDateSettingTab } from './settingsTab';
import { createTaskLine, parseTaskLine, stripListPrefix, toggleTaskLine } from './taskLine';
import { TODO_STATE, formatFieldNow, hasTimePlaceholder, shouldIntercept } from './stateEngine';

export default class TasksCustomDatePlugin extends Plugin {
    private readingModeHandler: ReadingModeHandler | undefined;

    public async onload(): Promise<void> {
        await initializeI18n();
        console.log(i18n.t('main.loadingPlugin', { name: this.manifest.name, version: this.manifest.version }));

        await this.loadSettings();

        this.addSettingTab(new TasksCustomDateSettingTab(this.app, this));
        this.registerEditorSuggest(new CreatedDateSuggest(this.app));

        this.addCommand({
            id: 'edit-task',
            name: i18n.t('commands.editTask'),
            icon: 'pencil',
            editorCallback: (editor: Editor) => {
                const lineNumber = editor.getCursor().line;
                new CreateOrEditTaskModal(this.app, editor, lineNumber, editor.getLine(lineNumber)).open();
            },
        });

        this.addCommand({
            id: 'toggle-done',
            name: i18n.t('commands.toggleDone'),
            icon: 'check-in-circle',
            editorCallback: (editor: Editor) => {
                const lineNumber = editor.getCursor().line;
                const line = editor.getLine(lineNumber);
                const settings = getSettings();
                const parsed = parseTaskLine(line, getTimeFormat(settings));
                const replacement =
                    parsed !== null
                        ? toggleTaskLine(line, settings)
                        : createTaskLine(line, stripListPrefix(line), ' ', settings);
                if (replacement !== null && replacement !== line) {
                    editor.setLine(lineNumber, replacement);
                }
            },
        });

        this.addCommand({
            id: 'insert-created-date',
            name: i18n.t('commands.insertCreatedDate'),
            icon: 'plus',
            editorCallback: (editor: Editor) => {
                const lineNumber = editor.getCursor().line;
                const lineText = editor.getLine(lineNumber);
                const settings = getSettings();
                const parsed = parseTaskLine(lineText, getTimeFormat(settings));
                if (parsed === null || parsed.created !== undefined) {
                    return;
                }
                if (!shouldIntercept(lineText, settings)) {
                    return;
                }
                if (!hasTimePlaceholder(TODO_STATE.format)) {
                    return;
                }
                const field = formatFieldNow(TODO_STATE.format, (window as any).moment(), settings);
                editor.replaceRange(field, { line: lineNumber, ch: lineText.length });
                editor.setCursor({ line: lineNumber, ch: lineText.length + field.length });
            },
        });

        this.registerEditorExtension(newLivePreviewExtension());
        this.readingModeHandler = new ReadingModeHandler(this);
    }

    public onunload(): void {}

    public async loadSettings(): Promise<void> {
        const data = await this.loadData();
        const merged = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
        if (data?.todoName === undefined) {
            merged.todoName = i18n.t('settings.fields.todoLabel');
        }
        if (data?.doneName === undefined) {
            merged.doneName = i18n.t('settings.fields.doneLabel');
        }
        updateSettings(merged);
    }

    public async saveSettings(): Promise<void> {
        await this.saveData(getSettings());
    }
}
