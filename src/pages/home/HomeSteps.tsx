import { useTranslation } from "react-i18next";
import styles from "./HomeSteps.module.css";

export function HomeSteps() {
  const { t } = useTranslation();

  return (
    <footer className={styles.steps}>
      <div className={styles.step}>
        <span className={styles.stepNumber}>①</span>
        <span className={styles.stepLabel}>{t("home.steps.one")}</span>
      </div>
      <div className={styles.step}>
        <span className={styles.stepNumber}>②</span>
        <span className={styles.stepLabel}>{t("home.steps.two")}</span>
      </div>
      <div className={styles.step}>
        <span className={styles.stepNumber}>③</span>
        <span className={styles.stepLabel}>{t("home.steps.three")}</span>
      </div>
    </footer>
  );
}
