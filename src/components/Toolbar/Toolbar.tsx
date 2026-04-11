import { useTranslation } from "react-i18next";
import styles from "./Toolbar.module.css";

export interface ToolbarProps {
  onOpenCalibration: () => void;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
}

export function Toolbar({
  onOpenCalibration,
  onToggleFullscreen,
  onToggleTheme,
}: ToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.btn}
        aria-label={t("calibration.title")}
        onClick={onOpenCalibration}
      >
        {"\u{1F50A}"}
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Fullscreen"
        onClick={onToggleFullscreen}
      >
        {"\u26F6"}
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Theme"
        onClick={onToggleTheme}
      >
        {"\u263E"}
      </button>
    </div>
  );
}
