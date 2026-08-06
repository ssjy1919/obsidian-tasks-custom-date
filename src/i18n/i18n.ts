import i18next from 'i18next';
import be from './locales/be.json';
import en from './locales/en.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';
import zh_cn from './locales/zh_cn.json';

let isInitialized = false;

function getObsidianLanguage(): string {
    const storedLanguage = localStorage.getItem('language');
    return storedLanguage?.toLowerCase() || 'en';
}

export const initializeI18n = async (): Promise<void> => {
    if (isInitialized) {
        return;
    }
    await i18next.init({
        lng: getObsidianLanguage(),
        fallbackLng: 'en',
        returnEmptyString: false,
        resources: {
            be: { translation: be },
            en: { translation: en },
            ru: { translation: ru },
            uk: { translation: uk },
            zh: { translation: zh_cn },
            'zh-cn': { translation: zh_cn },
            'zh-CN': { translation: zh_cn },
        },
        interpolation: {
            escapeValue: false,
        },
    });
    isInitialized = true;
};

export const i18n = new Proxy(i18next, {
    get(target, prop) {
        if (!isInitialized && prop === 't') {
            throw new Error('i18n.t() called before initialization. Call initializeI18n() first.');
        }
        return Reflect.get(target, prop);
    },
});
