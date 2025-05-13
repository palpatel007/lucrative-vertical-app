const fs = require('fs');
const axios = require('axios');
const path = require('path');

const en = require('./app/i18n/en.json');
const targetLangs = [
  'de','ar','bg','zh','hr','cs','da','nl','fi','fr','el','he','hi','hu','id','it','ja','ko','ms','no','pl','pt','ro','ru','es','sv','th','tr','uk','vi'
];

const API_URL = 'https://libretranslate.de/translate';

async function translateText(text, target) {
  const res = await axios.post(API_URL, {
    q: text,
    source: 'en',
    target,
    format: 'text'
  }, {
    headers: { 'accept': 'application/json' }
  });
  return res.data.translatedText;
}

async function main() {
  for (const lang of targetLangs) {
    const out = {};
    for (const key in en) {
      try {
        out[key] = await translateText(en[key], lang);
        console.log(`[${lang}] ${en[key]} => ${out[key]}`);
      } catch (e) {
        console.error(`Error translating "${en[key]}" to ${lang}:`, e.message);
        out[key] = en[key]; // fallback to English
      }
    }
    fs.writeFileSync(
      path.join(__dirname, `app/i18n/${lang}.json`),
      JSON.stringify(out, null, 2)
    );
    console.log(`Wrote app/i18n/${lang}.json`);
  }
}

main(); 