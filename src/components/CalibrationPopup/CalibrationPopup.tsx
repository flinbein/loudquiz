import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { MusicRow } from "./rows/MusicRow";
import { SignalRow } from "./rows/SignalRow";
import { VibrationRow } from "./rows/VibrationRow";
import { SharedHeadphonesRow } from "./rows/SharedHeadphonesRow";
import { InstructionsBlock } from "./rows/InstructionsBlock";
import { Divider } from "./rows/CalibrationRow";
import {
  ClockCalibrationSection,
  type CalibrationRole,
} from "./ClockCalibration/ClockCalibrationSection";
import styles from "./CalibrationPopup.module.css";

export interface CalibrationPopupProps {
  open: boolean;
  onClose: () => void;
  role: CalibrationRole;
  music: {
    volume: number;
    isPlaying: boolean;
    onVolumeChange: (v: number) => void;
    onTogglePlay: () => void;
  };
  signal: {
    volume: number;
    onVolumeChange: (v: number) => void;
    onTest: () => void;
  };
  vibration: {
    enabled: boolean;
    supported: boolean;
    onEnabledChange: (enabled: boolean) => void;
    onTest: () => void;
  };
  sharedHeadphones: {
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
  };
  clock: {
    expanded: boolean;
    onToggleExpanded: () => void;
    offset: number;
    tempOffset: number;
    onTempOffsetChange: (ms: number) => void;
    onApply: () => void;
    onResync: () => void;
    syncing: boolean;
    syncFailed: boolean;
    displayTimeMs: number;
    pulsing: boolean;
  };
}

/**
 * Calibration popup composition. Pure — no hooks, no stores, no side effects.
 * All data and callbacks come through props from CalibrationPopupContainer.
 */
export function CalibrationPopup(props: CalibrationPopupProps) {
  const { t } = useTranslation();
  const {
    open,
    onClose,
    role,
    music,
    signal,
    vibration,
    sharedHeadphones,
    clock,
  } = props;

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel={t("calibration.title")}>
      <div className={styles.title}>{t("calibration.title")}</div>

      <MusicRow
        volume={music.volume}
        onVolumeChange={music.onVolumeChange}
        isPlaying={music.isPlaying}
        onTogglePlay={music.onTogglePlay}
      />
      <SignalRow
        volume={signal.volume}
        onVolumeChange={signal.onVolumeChange}
        onTest={signal.onTest}
      />
      <VibrationRow
        enabled={vibration.enabled}
        supported={vibration.supported}
        onEnabledChange={vibration.onEnabledChange}
        onTest={vibration.onTest}
      />

      <Divider />

      <SharedHeadphonesRow
        enabled={sharedHeadphones.enabled}
        onEnabledChange={sharedHeadphones.onEnabledChange}
      />

      <Divider />

      <ClockCalibrationSection
        role={role}
        expanded={clock.expanded}
        onToggleExpanded={clock.onToggleExpanded}
        offset={clock.offset}
        tempOffset={clock.tempOffset}
        onTempOffsetChange={clock.onTempOffsetChange}
        onApply={clock.onApply}
        onResync={clock.onResync}
        syncing={clock.syncing}
        syncFailed={clock.syncFailed}
        displayTimeMs={clock.displayTimeMs}
        pulsing={clock.pulsing}
        volume={signal.volume}
      />

      <InstructionsBlock />
    </BottomSheet>
  );
}
