import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage } from "@/persistence/localPersistence";
import ru from "./ru.json";
import en from "./en.json";

const savedLanguage = getLanguage();

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: savedLanguage ?? "ru",
  fallbackLng: "ru",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
