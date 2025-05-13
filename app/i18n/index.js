import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';

// Dynamically require all other language files if they exist, fallback to en
const langs = [
  'de','ar','bg','zh','hr','cs','da','nl','fi','fr','el','he','hi','hu','id','it','ja','ko','ms','no','pl','pt','ro','ru','es','sv','th','tr','uk','vi'
];
const resources = { en: { translation: en } };
langs.forEach(l => {
  try {
    resources[l] = { translation: require(`./${l}.json`) };
  } catch {
    resources[l] = { translation: en };
  }
});

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n; 