import { useTranslation } from "react-i18next";
import { ClockDisplay } from "./ClockDisplay";
import { ClockTick } from "./ClockTick";
import { OffsetSlider } from "./OffsetSlider";
import { OffsetControls } from "./OffsetControls";
import styles from "./ClockCalibrationSection.module.css";

export type CalibrationRole = "host" | "player";

export interface ClockCalibrationSectionProps {
  role: CalibrationRole;
  expanded: boolean;
  onToggleExpanded: () => void;

  /** From clockSyncStore. Host is always 0. */
  offset: number;

  /** Local temp nudge, player-only. Ignored on host. */
  tempOffset: number;
  onTempOffsetChange: (ms: number) => void;
  onApply: () => void;
  onResync: () => void;
  syncing: boolean;
  syncFailed: boolean;

  /** Virtual clock time in ms (already offset-corrected). */
  displayTimeMs: number;
  pulsing: boolean;

  /** Signal volume used for the tick sound */
  volume: number;
}

export function ClockCalibrationSection(props: ClockCalibrationSectionProps) {
  const { t } = useTranslation();
  const {
    role,
    expanded,
    onToggleExpanded,
    offset,
    tempOffset,
    onTempOffsetChange,
    onApply,
    onResync,
    syncing,
    syncFailed,
    displayTimeMs,
    pulsing,
    volume,
  } = props;

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
      >
        {t("calibration.clockSection")}
        <span aria-hidden>{expanded ? "\u25B4" : "\u25BE"}</span>
      </button>

      {expanded && (
        <div className={styles.body}>
          <ClockDisplay timeMs={displayTimeMs} pulsing={pulsing} />
          <ClockTick
            enabled={expanded}
            offset={offset}
            tempOffset={tempOffset}
            volume={volume}
          />
          {role === "player" && (
            <>
              <OffsetSlider
                value={tempOffset}
                onChange={onTempOffsetChange}
                disabled={syncing}
              />
              <OffsetControls
                offset={offset}
                tempOffset={tempOffset}
                onApply={onApply}
                onResync={onResync}
                syncing={syncing}
                syncFailed={syncFailed}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
