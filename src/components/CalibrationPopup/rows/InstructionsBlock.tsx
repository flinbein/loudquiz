import { useTranslation } from "react-i18next";
import styles from "./CalibrationRow.module.css";

export function InstructionsBlock() {
  const { t } = useTranslation();
  return <div className={styles.instructions}>{t("calibration.instructions")}</div>;
}
