import styles from "./LanguageSwitcher.module.css";

export interface LanguageSwitcherProps {
  currentLang: string;
  onChangeLang: (lang: string) => void;
}

export function LanguageSwitcher({ currentLang, onChangeLang }: LanguageSwitcherProps) {
  function toggle() {
    onChangeLang(currentLang === "ru" ? "en" : "ru");
  }

  return (
    <button type="button" className={styles.btn} onClick={toggle}>
      {currentLang}
    </button>
  );
}
