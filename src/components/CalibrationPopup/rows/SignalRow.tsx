import { useTranslation } from "react-i18next";
import { VolumeSlider } from "@/components/VolumeSlider/VolumeSlider";
import { CalibrationRow } from "./CalibrationRow";
import styles from "./CalibrationRow.module.css";

export interface SignalRowProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  onTest: () => void;
}

export function SignalRow({ volume, onVolumeChange, onTest }: SignalRowProps) {
  const { t } = useTranslation();
  return (
    <CalibrationRow icon={"\u{1F514}"} label={t("calibration.signal")}>
      <button
        type="button"
        className={`${styles.iconButton} ${styles.iconButtonGhost}`}
        aria-label={t("calibration.testSignal")}
        onClick={onTest}
      >
        {"\u266A"}
      </button>
      <VolumeSlider
        value={volume}
        onChange={onVolumeChange}
        label={t("calibration.signal")}
      />
    </CalibrationRow>
  );
}
