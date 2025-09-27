import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enTranslation from "../public/locales/en/translation.json";
import ruTranslation from "../public/locales/ru/translation.json";
import ukTranslation from "../public/locales/uk/translation.json";
import zhTranslation from "../public/locales/zh/translation.json";
import ptTranslation from "../public/locales/pt/translation.json";
import esTranslation from "../public/locales/es/translation.json";
import deTranslation from "../public/locales/de/translation.json";
import frTranslation from "../public/locales/fr/translation.json";
import plTranslation from "../public/locales/pl/translation.json";
import trTranslation from "../public/locales/tr/translation.json";
import jaTranslation from "../public/locales/ja/translation.json";

const resources = {
  en: { translation: enTranslation },
  ru: { translation: ruTranslation },
  uk: { translation: ukTranslation },
  zh: { translation: zhTranslation },
  pt: { translation: ptTranslation },
  es: { translation: esTranslation },
  de: { translation: deTranslation },
  fr: { translation: frTranslation },
  pl: { translation: plTranslation },
  tr: { translation: trTranslation },
  ja: { translation: jaTranslation },
};

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "pl", name: "Polski", flag: "🇵🇱" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES.map((lang) => lang.code),
    fallbackLng: "en",
    debug: process.env.NODE_ENV === "development",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
    },
  });

export default i18n;
