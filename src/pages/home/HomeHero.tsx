import { useTranslation } from "react-i18next";
import styles from "./HomeHero.module.css";

export function HomeHero() {
  const { t } = useTranslation();

  return (
    <div className={styles.hero}>
      <h1 className={styles.title}>
        <span>LOUD</span>
        <span className={styles.accent}>QUIZ</span>
      </h1>
      <p className={styles.slogan}>{t("home.slogan")}</p>
    </div>
  );
}
