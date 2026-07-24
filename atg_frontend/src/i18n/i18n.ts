import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from '../locales/en/translation.json';
import ar from '../locales/ar/translation.json';
import zh from '../locales/zh/translation.json';
import fr from '../locales/fr/translation.json';
import ru from '../locales/ru/translation.json';
import es from '../locales/es/translation.json';
import ta from '../locales/ta/translation.json';
import si from '../locales/si/translation.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  zh: { translation: zh },
  fr: { translation: fr },
  ru: { translation: ru },
  es: { translation: es },
  ta: { translation: ta },
  si: { translation: si },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Handle RTL for Arabic automatically
i18n.on('languageChanged', (lng) => {
  const isRTL = lng === 'ar';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
