import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Toolbar } from "@/components/Toolbar/Toolbar";
import { CalibrationPopupContainer } from "./calibration/CalibrationPopupContainer";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { setTheme as saveTheme } from "@/persistence/localPersistence";
import type { CalibrationRole } from "@/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection";
import type { TeamId, PlayerData, PlayerDisplay } from "@/types/game";
import styles from "./GameShell.module.css";

export interface GameShellProps {
  role: CalibrationRole;
  onClockResync?: () => Promise<number>;
  children: React.ReactNode;
  player?: PlayerDisplay;
  phaseName?: string;
  phaseTeam?: TeamId;
  players?: PlayerData[];
  variant?: "inline" | "overlay";
}

export function GameShell({
  role,
  onClockResync,
  children,
  player,
  phaseName,
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
        phaseName={phaseName}
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
