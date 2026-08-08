import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CustomStateModal } from './customStateModal';
import { i18n } from './i18n/i18n';
import {
    TIME_FORMAT_PRESETS,
    getTimeFormat,
    getSettings,
    updateSettings,
    type Settings,
    type TaskStateConfig,
    type TimeFormatPreset,
    type TransitionScope,
} from './settings';
import {
    DONE_STATE,
    TODO_STATE,
    getStateSequence,
    statusTransitionSymbolsForSettings,
} from './stateEngine';

interface SettingsSavingPlugin extends Plugin {
    saveSettings(): Promise<void>;
}

export class TasksCustomDateSettingTab extends PluginSettingTab {
    private readonly plugin: SettingsSavingPlugin;

    constructor(app: App, plugin: SettingsSavingPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    public display(): void {
        const { containerEl } = this;
        containerEl.empty();

        this.renderInterception(containerEl);
        this.renderTimeFormatSettings(containerEl);
        this.renderSuggestionSettings(containerEl);
        this.renderTransitionEngine(containerEl);
    }

    private renderInterception(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName(i18n.t('settings.intercept.name'))
            .setDesc(i18n.t('settings.intercept.desc'))
            .addText((text) => {
                text
                    .setValue(getSettings().interceptTrigger)
                    .onChange(async (value) => {
                        updateSettings({ interceptTrigger: value });
                        await this.plugin.saveSettings();
                    });
            });
    }

    private renderTransitionEngine(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName(i18n.t('settings.transitionScope.name'))
            .setDesc(i18n.t('settings.transitionScope.desc'))
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('none', i18n.t('settings.transitionScope.none'))
                    .addOption('all', i18n.t('settings.transitionScope.all'))
                    .addOption('tag', i18n.t('settings.transitionScope.tag'))
                    .setValue(getSettings().transitionScope)
                    .onChange(async (value) => {
                        updateSettings({ transitionScope: value as TransitionScope });
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        if (getSettings().transitionScope === 'tag') {
            new Setting(containerEl)
                .setName(i18n.t('settings.transitionTrigger.name'))
                .setDesc(i18n.t('settings.transitionTrigger.desc'))
                .addText((text) => {
                    text
                        .setPlaceholder('#custom')
                        .setValue(getSettings().transitionTrigger)
                        .onChange(async (value) => {
                            updateSettings({ transitionTrigger: value });
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.addEventListener('blur', async () => {
                        if (text.getValue().trim().length === 0) {
                            const fallback = '#custom';
                            text.setValue(fallback);
                            updateSettings({ transitionTrigger: fallback });
                            await this.plugin.saveSettings();
                        }
                    });
                });
        }

        new Setting(containerEl)
            .setName(i18n.t('settings.alwaysWriteCreated.name'))
            .setDesc(i18n.t('settings.alwaysWriteCreated.desc'))
            .addToggle((toggle) => {
                toggle.setValue(getSettings().alwaysWriteCreated).onChange(async (value) => {
                    updateSettings({ alwaysWriteCreated: value });
                    await this.plugin.saveSettings();
                });
            });

        if (getSettings().transitionScope === 'none') {
            new Setting(containerEl).setName(i18n.t('settings.fields.name')).setHeading();
            this.renderStateRows(containerEl, false);
        } else {
            new Setting(containerEl).setName(i18n.t('settings.states.name')).setHeading();
            this.renderStateRows(containerEl, true);
        }
    }

    private renderStateRows(containerEl: HTMLElement, includeCustom: boolean): void {
        const settings = getSettings();
        const sequence = getStateSequence(settings);

        for (const state of sequence) {
            const isBase = state.id === TODO_STATE.id || state.id === DONE_STATE.id;
            if (!isBase && !includeCustom) {
                continue;
            }
            const label = state.name;
            const setting = new Setting(containerEl);
            const transition = statusTransitionSymbolsForSettings(state.symbol, settings);
            const nextState = getStateSequence(settings).find(
                (candidate) => candidate.symbol === transition.next,
            );
            const transitionEl = document.createElement('span');
            transitionEl.className = 'tasks-state-transition';
            transitionEl.textContent = i18n.t('settings.states.transition', {
                next: transition.next,
                nextName: nextState?.name ?? TODO_STATE.name,
            });
            const nameFragment = document.createDocumentFragment();
            nameFragment.append(`[${state.symbol}] ${label} `, transitionEl);
            setting.setName(nameFragment);
            setting.nameEl.addClass('tasks-state-name');

            if (!isBase) {
                const index = settings.customStates.findIndex((s) => s.id === state.id);
                if (index > 0) {
                    setting.addExtraButton((button) => {
                        button
                            .setIcon('arrow-up')
                            .setTooltip(i18n.t('settings.states.moveUp'))
                            .onClick(async () => {
                                const current = [...getSettings().customStates];
                                const [moved] = current.splice(index, 1);
                                current.splice(index - 1, 0, moved);
                                updateSettings({ customStates: current });
                                await this.plugin.saveSettings();
                                this.display();
                            });
                    });
                }
                if (index < settings.customStates.length - 1) {
                    setting.addExtraButton((button) => {
                        button
                            .setIcon('arrow-down')
                            .setTooltip(i18n.t('settings.states.moveDown'))
                            .onClick(async () => {
                                const current = [...getSettings().customStates];
                                const [moved] = current.splice(index, 1);
                                current.splice(index + 1, 0, moved);
                                updateSettings({ customStates: current });
                                await this.plugin.saveSettings();
                                this.display();
                            });
                    });
                }
            }

            setting.addExtraButton((button) => {
                button
                    .setIcon('pencil')
                    .setTooltip(i18n.t('settings.states.edit'))
                    .onClick(async () => {
                        const existingSymbols = isBase
                            ? []
                            : getSettings().customStates.filter((s) => s.id !== state.id).map((s) => s.symbol);
                        const modal = new CustomStateModal(this.app, state, existingSymbols, isBase);
                        modal.onClose = async () => {
                            if (modal.saved) {
                                if (isBase) {
                                    await this.updateStateField(state.id, {
                                        name: modal.state.name,
                                        format: modal.state.format,
                                        autoWrite: modal.state.autoWrite,
                                    });
                                } else {
                                    updateSettings({
                                        customStates: getSettings().customStates.map((s) =>
                                            s.id === state.id ? { ...modal.state } : s,
                                        ),
                                    });
                                    await this.plugin.saveSettings();
                                }
                                this.display();
                            }
                        };
                        modal.open();
                    });
            });

            if (!isBase) {
                setting.addButton((button) => {
                    button
                        .setButtonText(i18n.t('settings.states.delete'))
                        .setWarning()
                        .onClick(async () => {
                            updateSettings({
                                customStates: getSettings().customStates.filter(
                                    (s) => s.id !== state.id,
                                ),
                            });
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
            }
        }

        if (includeCustom) {
            new Setting(containerEl).addButton((button) => {
                button.setButtonText(i18n.t('settings.states.add')).onClick(async () => {
                    const id = `state-${Date.now()}`;
                    const newState: TaskStateConfig = {
                        id,
                        name: i18n.t('settings.states.newState'),
                        symbol: 'o',
                        format: ' [state:: {{time}}]',
                        autoWrite: true,
                    };
                    updateSettings({ customStates: [...getSettings().customStates, newState] });
                    await this.plugin.saveSettings();
                    this.display();
                });
            });
        }
    }

    private renderSuggestionSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName(i18n.t('settings.suggestTrigger.name'))
            .setDesc(i18n.t('settings.suggestTrigger.desc'))
            .addText((text) => {
                text
                    .setPlaceholder(' ')
                    .setValue(getSettings().suggestTrigger)
                    .onChange(async (value) => {
                        updateSettings({ suggestTrigger: value });
                        await this.plugin.saveSettings();
                    });
            });
    }

    private renderTimeFormatSettings(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName(i18n.t('settings.timeFormat.name'))
            .setDesc(i18n.t('settings.timeFormat.desc'))
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('iso', TIME_FORMAT_PRESETS.iso)
                    .addOption('dateTimeSpace', TIME_FORMAT_PRESETS.dateTimeSpace)
                    .addOption('dateOnly', TIME_FORMAT_PRESETS.dateOnly)
                    .addOption('custom', i18n.t('settings.timeFormat.custom'))
                    .setValue(getSettings().timeFormat)
                    .onChange(async (value) => {
                        updateSettings({ timeFormat: value as TimeFormatPreset });
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        if (getSettings().timeFormat === 'custom') {
            const docsDesc = document.createDocumentFragment();
            const intro = document.createElement('span');
            intro.textContent = `${i18n.t('settings.customTimeFormat.desc')} `;
            docsDesc.appendChild(intro);
            const docsLink = document.createElement('a');
            docsLink.href = 'https://momentjs.com/docs/#/displaying/';
            docsLink.textContent = i18n.t('settings.customTimeFormat.docs');
            docsLink.target = '_blank';
            docsLink.rel = 'noopener';
            docsLink.className = 'external-link';
            docsDesc.appendChild(docsLink);

            new Setting(containerEl)
                .setName(i18n.t('settings.customTimeFormat.name'))
                .setDesc(docsDesc)
                .addText((text) => {
                    text.setValue(getSettings().customTimeFormat).onChange(async (value) => {
                        updateSettings({ customTimeFormat: value });
                        await this.plugin.saveSettings();
                        updatePreview();
                    });
                });
        }

        const previewEl = containerEl.createDiv({ cls: 'tasks-time-format-preview' });
        const updatePreview = (): void => {
            const now = (window as any).moment();
            previewEl.setText(
                i18n.t('settings.timeFormat.preview', {
                    time: now.format(getTimeFormat(getSettings())),
                }),
            );
        };
        updatePreview();
    }

    private async updateCustomState(id: string, patch: Partial<TaskStateConfig>): Promise<void> {
        updateSettings({
            customStates: getSettings().customStates.map((state) =>
                state.id === id ? { ...state, ...patch } : state,
            ),
        });
        await this.plugin.saveSettings();
    }

    private async updateStateField(id: string, patch: Partial<TaskStateConfig>): Promise<void> {
        const settings = getSettings();
        if (id === TODO_STATE.id) {
            updateSettings({
                todoName: patch.name ?? settings.todoName,
                todoFormat: patch.format ?? settings.todoFormat,
                todoAutoWrite: patch.autoWrite ?? settings.todoAutoWrite,
            });
        } else if (id === DONE_STATE.id) {
            updateSettings({
                doneName: patch.name ?? settings.doneName,
                doneFormat: patch.format ?? settings.doneFormat,
                doneAutoWrite: patch.autoWrite ?? settings.doneAutoWrite,
            });
        } else {
            await this.updateCustomState(id, patch);
            return;
        }
        await this.plugin.saveSettings();
    }
}
