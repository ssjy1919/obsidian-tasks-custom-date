import { i18n, initializeI18n } from '../src/i18n/i18n';

beforeAll(async () => {
    localStorage.setItem('language', 'en');
    await initializeI18n();
});

describe('i18n', () => {
    it('loads English strings', () => {
        expect(i18n.t('commands.editTask')).toBe('Create or edit task');
    });

    it('loads Chinese strings', () => {
        expect(i18n.t('commands.editTask', { lng: 'zh' })).toBe('创建或编辑任务');
    });

    it('falls back to English for missing translations', () => {
        expect(i18n.t('modal.title', { lng: 'ru' })).toBe('Create or edit task');
    });

    it('provides the time format preview and documentation link strings', () => {
        expect(i18n.t('settings.timeFormat.preview', { time: '2026-08-08' })).toBe(
            'Current time: 2026-08-08',
        );
        expect(i18n.t('settings.customTimeFormat.docs')).toContain('moment.js');
        expect(i18n.t('settings.alwaysWriteCreated.name')).toBe('Always write created time');
        expect(
            i18n.t('settings.states.transition', { next: 'x', nextName: 'Done' }),
        ).toBe('\u00A0\u00A0\u00A0( ◔ ω◔) ⇨\u00A0\u00A0\u00A0[x] Done');
    });
});
