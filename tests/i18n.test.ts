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
});
