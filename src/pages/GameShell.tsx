import { useEffect } from "react";
import { Toolbar } from "@/components/Toolbar/Toolbar";
import { CalibrationPopupContainer } from "./calibration/CalibrationPopupContainer";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { setTheme as saveTheme } from "@/persistence/localPersistence";
import type { CalibrationRole } from "@/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection";
import styles from "./GameShell.module.css";

export interface GameShellProps {
  role: CalibrationRole;
  /**
   * Runs a fresh clock-sync handshake and returns the new offset. Provided
   * by the owning player transport (host passes undefined — host never re-syncs).
   */
  onClockResync?: () => Promise<number>;
  children: React.ReactNode;
}

/**
 * Layout wrapper for all host/player gameplay screens. Owns:
 *   - the Toolbar (top-right icon buttons)
 *   - the CalibrationPopupContainer
 *   - the global bridge `window.__calibrationResync` that connects the
 *     container's re-sync button to the transport.
 *
 * NOT mounted around `/`, `/setup`, `/rules`, `/constructor` — those pages
 * don't need calibration.
 */
export function GameShell({ role, onClockResync, children }: GameShellProps) {
  const setOpen = useCalibrationUiStore((s) => s.setOpen);

  useEffect(() => {
    if (!onClockResync) return;
    (window as unknown as { __calibrationResync?: () => Promise<number> }).__calibrationResync =
      onClockResync;
    return () => {
      delete (window as unknown as { __calibrationResync?: () => Promise<number> })
        .__calibrationResync;
    };
  }, [onClockResync]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    saveTheme(next);
  }

  return (
    <div className={styles.shell}>
      <Toolbar
        onOpenCalibration={() => setOpen(true)}
        onToggleFullscreen={toggleFullscreen}
        onToggleTheme={toggleTheme}
      />
      {children}
      <CalibrationPopupContainer role={role} />
    </div>
  );
}
