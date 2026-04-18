import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher/LanguageSwitcher";
import { setLanguage } from "@/persistence/localPersistence";
import styles from "./HomeTopBar.module.css";

export function HomeTopBar() {
  const { i18n } = useTranslation();

  function handleLanguageChange(lang: string) {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  const fullscreenSupported =
    typeof document !== "undefined" && document.fullscreenEnabled === true;

  return (
    <div className={styles.bar}>
      <LanguageSwitcher
        currentLang={i18n.language}
        onChangeLang={handleLanguageChange}
      />
      {fullscreenSupported && (
        <button
          type="button"
          className={styles.iconBtn}
          onClick={toggleFullscreen}
          aria-label="Fullscreen"
        >
          {"\u26F6"}
        </button>
      )}
    </div>
  );
}
