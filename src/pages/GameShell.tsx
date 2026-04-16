import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toolbar } from "@/components/Toolbar/Toolbar";
import { CalibrationPopupContainer } from "./calibration/CalibrationPopupContainer";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { setTheme as saveTheme } from "@/persistence/localPersistence";
import type { CalibrationRole } from "@/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection";
import type { TeamId, PlayerData, PlayerDisplay, GamePhase } from "@/types/game";
import styles from "./GameShell.module.css";

export interface GameShellProps {
  role: CalibrationRole;
  onClockResync?: () => Promise<number>;
  children: React.ReactNode;
  player?: PlayerDisplay;
  phase?: GamePhase;
  phaseTeam?: TeamId;
  players?: PlayerData[];
  variant?: "inline" | "overlay";
}

export function GameShell({
  role,
  onClockResync,
  children,
  player,
  phase,
  phaseTeam,
  players,
  variant = "overlay",
}: GameShellProps) {
  const setOpen = useCalibrationUiStore((s) => s.setOpen);
  const { t } = useTranslation();

  useEffect(() => {
    if (!onClockResync) return;
    (window as unknown as { __calibrationResync?: () => Promise<number> }).__calibrationResync =
      onClockResync;
    return () => {
      delete (window as unknown as { __calibrationResync?: () => Promise<number> })
        .__calibrationResync;
    };
  }, [onClockResync]);
  
  const needWakeLock = !!phase && phase !== "finale";
  useEffect(function WakeLock() {
    if (!navigator.wakeLock?.request) return;
    if (!needWakeLock) return;
    let released = false;
    let sentinel: WakeLockSentinel | null = null;

    function acquire() {
      if (released) return;
      navigator.wakeLock.request("screen").then(s => {
        if (released) { void s.release(); return; }
        sentinel = s;
      }).catch(() => {});
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") acquire();
    }

    acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (sentinel) void sentinel.release();
    };
  }, [needWakeLock]);

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

  const teamLabels: Partial<Record<TeamId, string>> = {
    red: t("teams.red"),
    blue: t("teams.blue"),
    none: t("teams.none"),
  };

  return (
    <div className={styles.shell}>
      <Toolbar
        variant={variant}
        player={player}
        phaseName={t(`phase.${phase}`)}
        phaseTeam={phaseTeam}
        players={players}
        teamLabels={teamLabels}
        onOpenCalibration={() => setOpen(true)}
        onToggleFullscreen={toggleFullscreen}
        onToggleTheme={toggleTheme}
      />
      {children}
      <CalibrationPopupContainer role={role} />
    </div>
  );
}
