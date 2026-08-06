export type TaskFieldFormat = 'dataview' | 'emoji';
export type TimeFormatPreset = 'iso' | 'dateTimeSpace' | 'dateOnly' | 'custom';

export interface Settings {
    setCreatedDate: boolean;
    setDoneDate: boolean;
    setCancelledDate: boolean;
    taskFormat: TaskFieldFormat;
    suggestTrigger: string;
    timeFormat: TimeFormatPreset;
    customTimeFormat: string;
}

export const TIME_FORMAT_PRESETS: Record<Exclude<TimeFormatPreset, 'custom'>, string> = {
    iso: 'YYYY-MM-DDTHH:mm:ssZ',
    dateTimeSpace: 'YYYY-MM-DD HH:mm',
    dateOnly: 'YYYY-MM-DD',
};

export const DEFAULT_SETTINGS: Settings = {
    setCreatedDate: true,
    setDoneDate: true,
    setCancelledDate: true,
    taskFormat: 'dataview',
    suggestTrigger: ' ',
    timeFormat: 'iso',
    customTimeFormat: TIME_FORMAT_PRESETS.iso,
};

let settings: Settings = { ...DEFAULT_SETTINGS };

export function getSettings(): Settings {
    return { ...settings };
}

export function updateSettings(newSettings: Partial<Settings>): Settings {
    settings = { ...settings, ...newSettings };
    return getSettings();
}

export function resetSettings(): Settings {
    settings = { ...DEFAULT_SETTINGS };
    return getSettings();
}

export function getTimeFormat(currentSettings: Settings): string {
    if (currentSettings.timeFormat === 'custom') {
        const custom = currentSettings.customTimeFormat.trim();
        return custom.length > 0 ? custom : TIME_FORMAT_PRESETS.iso;
    }
    return TIME_FORMAT_PRESETS[currentSettings.timeFormat];
}
