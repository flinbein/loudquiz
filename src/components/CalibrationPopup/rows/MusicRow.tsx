import { useTranslation } from "react-i18next";
import { VolumeSlider } from "@/components/VolumeSlider/VolumeSlider";
import { CalibrationRow } from "./CalibrationRow";
import styles from "./CalibrationRow.module.css";

export interface MusicRowProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export function MusicRow({
  volume,
  onVolumeChange,
  isPlaying,
  onTogglePlay,
}: MusicRowProps) {
  const { t } = useTranslation();
  return (
    <CalibrationRow icon={"\u{1F3B5}"} label={t("calibration.music")}>
      <button
        type="button"
        className={styles.iconButton}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? t("calibration.pauseMusic") : t("calibration.playMusic")}
        onClick={onTogglePlay}
      >
        {isPlaying ? "\u23F8" : "\u25B6"}
      </button>
      <VolumeSlider
        value={volume}
        onChange={onVolumeChange}
        label={t("calibration.music")}
      />
    </CalibrationRow>
  );
}
