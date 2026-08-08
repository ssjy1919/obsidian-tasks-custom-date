export type TaskFieldFormat = 'dataview' | 'emoji';
export type TimeFormatPreset = 'iso' | 'dateTimeSpace' | 'dateOnly' | 'custom';
export type TransitionScope = 'none' | 'all' | 'tag';

export interface TaskStateConfig {
    id: string;
    name: string;
    symbol: string;
    format: string;
    autoWrite: boolean;
}

export interface Settings {
    setCreatedDate: boolean;
    setDoneDate: boolean;
    setCancelledDate: boolean;
    alwaysWriteCreated: boolean;
    taskFormat: TaskFieldFormat;
    suggestTrigger: string;
    interceptTrigger: string;
    transitionScope: TransitionScope;
    transitionTrigger: string;
    customStates: TaskStateConfig[];
    todoName: string;
    doneName: string;
    todoFormat: string;
    todoAutoWrite: boolean;
    doneFormat: string;
    doneAutoWrite: boolean;
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
    alwaysWriteCreated: false,
    taskFormat: 'dataview',
    suggestTrigger: ' ',
    interceptTrigger: '#custom',
    transitionScope: 'tag',
    transitionTrigger: '#custom',
    customStates: [
        {
            id: 'in-progress',
            name: 'In Progress',
            symbol: '/',
            format: ' [in_progress:: {{time}}]',
            autoWrite: true,
        },
        {
            id: 'cancelled',
            name: 'Cancelled',
            symbol: '-',
            format: ' [cancelled:: {{time}}]',
            autoWrite: true,
        },
    ],
    todoName: 'Todo',
    doneName: 'Done',
    todoFormat: ' [created:: {{time}}]',
    todoAutoWrite: true,
    doneFormat: ' [completion:: {{time}}]',
    doneAutoWrite: true,
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
