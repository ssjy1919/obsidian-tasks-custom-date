import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { i18n } from './i18n/i18n';
import {
    TIME_FORMAT_PRESETS,
    getSettings,
    updateSettings,
    type TaskFieldFormat,
    type TimeFormatPreset,
} from './settings';

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

        new Setting(containerEl)
            .setName(i18n.t('settings.taskFormat.name'))
            .setDesc(i18n.t('settings.taskFormat.desc'))
            .addDropdown((dropdown) => {
                dropdown
                    .addOption('dataview', 'Dataview')
                    .addOption('emoji', 'Emoji')
                    .setValue(getSettings().taskFormat)
                    .onChange(async (value) => {
                        updateSettings({ taskFormat: value as TaskFieldFormat });
                        await this.plugin.saveSettings();
                    });
            });

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
            new Setting(containerEl)
                .setName(i18n.t('settings.customTimeFormat.name'))
                .setDesc(i18n.t('settings.customTimeFormat.desc'))
                .addText((text) => {
                    text.setValue(getSettings().customTimeFormat).onChange(async (value) => {
                        updateSettings({ customTimeFormat: value });
                        await this.plugin.saveSettings();
                    });
                });
        }

        new Setting(containerEl)
            .setName(i18n.t('settings.created.name'))
            .setDesc(i18n.t('settings.created.desc'))
            .addToggle((toggle) => {
                toggle.setValue(getSettings().setCreatedDate).onChange(async (value) => {
                    updateSettings({ setCreatedDate: value });
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(i18n.t('settings.done.name'))
            .setDesc(i18n.t('settings.done.desc'))
            .addToggle((toggle) => {
                toggle.setValue(getSettings().setDoneDate).onChange(async (value) => {
                    updateSettings({ setDoneDate: value });
                    await this.plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(i18n.t('settings.cancelled.name'))
            .setDesc(i18n.t('settings.cancelled.desc'))
            .addToggle((toggle) => {
                toggle.setValue(getSettings().setCancelledDate).onChange(async (value) => {
                    updateSettings({ setCancelledDate: value });
                    await this.plugin.saveSettings();
                });
            });
    }
}
