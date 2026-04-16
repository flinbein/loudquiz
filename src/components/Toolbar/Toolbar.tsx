import { useState, useEffect, useRef } from "react";
import type { TeamId, PlayerData, PlayerDisplay } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./Toolbar.module.css";
import cn from "classnames";

export interface ToolbarProps {
  variant?: "inline" | "overlay";
  player?: PlayerDisplay;
  phaseName?: string;
  phaseTeam?: TeamId;
  players?: PlayerData[];
  teamLabels?: Partial<Record<TeamId, string>>;
  onOpenCalibration: () => void;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
}

export function Toolbar({
  variant = "overlay",
  player,
  phaseName,
  phaseTeam = "none",
  players,
  teamLabels,
  onOpenCalibration,
  onToggleFullscreen,
  onToggleTheme,
}: ToolbarProps) {
  const [open, setOpen] = useState<"menu" | "players" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  function togglePanel(panel: "menu" | "players") {
    setOpen((prev) => (prev === panel ? null : panel));
  }

  const isPlayerMode = !!player;

  return (
    <div
      ref={containerRef}
      className={styles.toolbar}
      data-variant={variant}
    >
      <div className={styles.bar}>
        {isPlayerMode && (
          <div className={styles.playerInfo} data-menu-open={open === "menu" || undefined}>
            <PlayerAvatar size={32} emoji={player!.emoji} team={player!.team} onClick={() => togglePanel("players")} />
            <span className={styles.playerName} data-team={player!.team}>
              {player!.name}
            </span>
            <span className={styles.separator}>|</span>
            <span
              className={styles.phaseName}
              data-team={phaseTeam}
              aria-live="polite"
              role="status"
              title={phaseName}
            >
              {phaseName}
            </span>
          </div>
        )}
        <div className={cn(styles.menuPanel, {[styles.menuPanelHidden!]: open !== "menu"})}>
          <button type="button" className={styles.panelBtn} onClick={() => { onOpenCalibration(); setOpen(null); }}>
            {"\u{1F50A}"}
          </button>
          <button type="button" className={styles.panelBtn} onClick={() => { onToggleFullscreen(); setOpen(null); }}>
            {"\u26F6"}
          </button>
          <button type="button" className={styles.panelBtn} onClick={() => { onToggleTheme(); setOpen(null); }}>
            {"\u263E"}
          </button>
        </div>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => togglePanel("menu")}
          aria-expanded={open === "menu"}
          aria-label="Menu"
        >
          {"\u2630"}
        </button>
      </div>
      
      {open === "players" && isPlayerMode && players && (
        <PlayersPanel players={players} teamLabels={teamLabels} />
      )}
    </div>
  );
}

function PlayersPanel({
  players,
  teamLabels,
}: {
  players: PlayerData[];
  teamLabels?: Partial<Record<TeamId, string>>;
}) {
  const teams = new Map<TeamId, PlayerData[]>();
  for (const p of players) {
    const arr = teams.get(p.team) ?? [];
    arr.push(p);
    teams.set(p.team, arr);
  }

  return (
    <div className={styles.playersPanel}>
      {Array.from(teams.entries()).map(([teamId, members]) => (
        <div key={teamId} className={styles.teamGroup} data-team={teamId}>
          {teamLabels?.[teamId] && (
            <div className={styles.teamLabel}>{teamLabels[teamId]}</div>
          )}
          {members.map((p) => (
            <div key={p.name} className={styles.playerRow}>
              <PlayerAvatar size={28} emoji={p.emoji} team={p.team} online={p.online} />
              <span className={styles.playerRowName}>{p.name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
