import { useTranslation } from "react-i18next";

export interface OffsetControlsProps {
  /** Current committed offset from clockSyncStore (ms) */
  offset: number;
  /** Pending temp offset (ms), 0 if none */
  tempOffset: number;
  onApply: () => void;
  onResync: () => void;
  /** True while re-sync handshake is running */
  syncing: boolean;
  /** Last re-sync failed */
  syncFailed: boolean;
}

/**
 * Numeric readout + Apply + Re-sync buttons.
 *
 * Pure: parent owns all state; this component only renders and forwards
 * click events.
 */
export function OffsetControls({
  offset,
  tempOffset,
  onApply,
  onResync,
  syncing,
  syncFailed,
}: OffsetControlsProps) {
  const { t } = useTranslation();
  const applyDisabled = tempOffset === 0 || syncing;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        {t("calibration.clockOffset", { value: formatSigned(offset) })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-live="polite">
          {tempOffset !== 0
            ? t("calibration.clockPending", {
                sign: tempOffset > 0 ? "+" : "",
                value: tempOffset,
              })
            : ""}
        </span>
        <button
          type="button"
          onClick={onApply}
          disabled={applyDisabled}
          style={{ marginLeft: "auto" }}
        >
          {t("calibration.clockApply")}
        </button>
        <button
          type="button"
          onClick={onResync}
          disabled={syncing}
          aria-label={t("calibration.clockResync")}
        >
          {"\u{1F5D8}"}
        </button>
      </div>
      {syncFailed && (
        <div role="alert">{t("calibration.clockResyncFailed")}</div>
      )}
    </div>
  );
}

function formatSigned(ms: number): string {
  return ms > 0 ? `+${Math.round(ms)}` : String(Math.round(ms));
}
