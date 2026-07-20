import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import tr from "@/locales/tr.json";
import en from "@/locales/en.json";

// i18n setup. Turkish is the default/fallback; the chosen language is detected
// from localStorage → browser, and persisted to localStorage.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    fallbackLng: "tr",
    supportedLngs: ["tr", "en"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "meet:lang",
    },
  });

// Keep <html lang> in sync with the active language.
const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng;
};
syncHtmlLang(i18n.resolvedLanguage ?? "tr");
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
