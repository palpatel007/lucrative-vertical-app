const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// List of language codes from your dropdown
const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English', country: 'US' },
  { code: 'ar', label: 'Arabic', country: 'SA' },
  { code: 'bg', label: 'Bulgarian', country: 'BG' },
  { code: 'zh', label: 'Chinese', country: 'CN' },
  { code: 'hr', label: 'Croatian', country: 'HR' },
  { code: 'cs', label: 'Czech', country: 'CZ' },
  { code: 'da', label: 'Danish', country: 'DK' },
  { code: 'nl', label: 'Dutch', country: 'NL' },
  { code: 'fi', label: 'Finnish', country: 'FI' },
  { code: 'fr', label: 'French', country: 'FR' },
  { code: 'de', label: 'German', country: 'DE' },
  { code: 'el', label: 'Greek', country: 'GR' },
  { code: 'he', label: 'Hebrew', country: 'IL' },
  { code: 'hi', label: 'Hindi', country: 'IN' },
  { code: 'hu', label: 'Hungarian', country: 'HU' },
  { code: 'id', label: 'Indonesian', country: 'ID' },
  { code: 'it', label: 'Italian', country: 'IT' },
  { code: 'ja', label: 'Japanese', country: 'JP' },
  { code: 'ko', label: 'Korean', country: 'KR' },
  { code: 'ms', label: 'Malay', country: 'MY' },
  { code: 'no', label: 'Norwegian', country: 'NO' },
  { code: 'pl', label: 'Polish', country: 'PL' },
  { code: 'pt', label: 'Portuguese', country: 'PT' },
  { code: 'ro', label: 'Romanian', country: 'RO' },
  { code: 'ru', label: 'Russian', country: 'RU' },
  { code: 'es', label: 'Spanish', country: 'ES' },
  { code: 'sv', label: 'Swedish', country: 'SE' },
  { code: 'th', label: 'Thai', country: 'TH' },
  { code: 'tr', label: 'Turkish', country: 'TR' },
  { code: 'uk', label: 'Ukrainian', country: 'UA' },
  { code: 'vi', label: 'Vietnamese', country: 'VN' }
];

const localesDir = path.join(__dirname, 'public', 'locales');
const enFile = path.join(localesDir, 'en', 'translation.json');
const en = JSON.parse(fs.readFileSync(enFile, 'utf8'));

const API_URL = 'https://translate.astian.org/translate';

async function translateText(text, target) {
  if (!text || typeof text !== 'string') return text;
  if (target === 'en') return text;
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        q: text,
        source: 'en',
        target,
        format: 'text',
        alternatives: 3,
        api_key: ''
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    await new Promise(r => setTimeout(r, 200)); // To avoid rate limit
    const data = await res.json();
    return data.translatedText;
  } catch (e) {
    console.error(`Error translating "${text}" to ${target}:`, e.message);
    return text; // fallback to English
  }
}

async function translateObject(template, lang) {
  if (Array.isArray(template)) {
    return Promise.all(template.map(async (item) => {
      if (typeof item === 'object' && item !== null) {
        return await translateObject(item, lang);
      }
      return await translateText(item, lang);
    }));
  } else if (typeof template === 'object' && template !== null) {
    const result = {};
    for (const key of Object.keys(template)) {
      result[key] = await translateObject(template[key], lang);
    }
    return result;
  } else {
    return await translateText(template, lang);
  }
}

(async () => {
  for (const { code } of LANGUAGE_OPTIONS) {
    if (code === 'en') continue;
    const langDir = path.join(localesDir, code);
    if (!fs.existsSync(langDir)) fs.mkdirSync(langDir);
    const langFile = path.join(langDir, 'translation.json');
    const translated = await translateObject(en, code);
    fs.writeFileSync(langFile, JSON.stringify(translated, null, 2), 'utf8');
    console.log(`Overwritten and translated ${langFile}`);
  }
  console.log('All translations overwritten and auto-translated from English for all dropdown languages.');
})(); 