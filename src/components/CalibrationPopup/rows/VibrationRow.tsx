import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "@/components/ToggleSwitch/ToggleSwitch";
import { CalibrationRow } from "./CalibrationRow";
import styles from "./CalibrationRow.module.css";

export interface VibrationRowProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onTest: () => void;
  supported: boolean;
}

export function VibrationRow({
  enabled,
  onEnabledChange,
  onTest,
  supported,
}: VibrationRowProps) {
  const { t } = useTranslation();
  return (
    <>
      <CalibrationRow icon={"\u{1F4F3}"} label={t("calibration.vibration")}>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.iconButtonGhost}`}
          aria-label={t("calibration.testVibration")}
          disabled={!supported}
          onClick={onTest}
        >
          {"\u{1F4F3}"}
        </button>
        <ToggleSwitch
          checked={enabled && supported}
          onChange={onEnabledChange}
          disabled={!supported}
          label={t("calibration.vibration")}
        />
      </CalibrationRow>
      {!supported && (
        <div className={styles.hint}>{t("calibration.vibrationUnsupported")}</div>
      )}
    </>
  );
}
