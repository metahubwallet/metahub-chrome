import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import zhCN from './zh-CN';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        'zh-CN': { translation: zhCN },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

export default i18n;
