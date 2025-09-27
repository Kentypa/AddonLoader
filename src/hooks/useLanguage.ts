import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../i18n";

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export function useLanguage() {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem("i18nextLng", lng);
  };

  const toggleLanguage = () => {
    const currentIndex = SUPPORTED_LANGUAGES.findIndex(
      (lang) => lang.code === currentLanguage
    );
    const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
    const nextLanguage = SUPPORTED_LANGUAGES[nextIndex].code;
    changeLanguage(nextLanguage);
  };

  const getCurrentLanguageInfo = (): Language => {
    return (
      SUPPORTED_LANGUAGES.find((lang) => lang.code === currentLanguage) ||
      SUPPORTED_LANGUAGES[0]
    );
  };

  return {
    currentLanguage,
    currentLanguageInfo: getCurrentLanguageInfo(),
    supportedLanguages: SUPPORTED_LANGUAGES,
    changeLanguage,
    toggleLanguage,
    t: i18n.t,
  };
}
