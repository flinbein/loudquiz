import cn from "classnames";
import type { TeamColor, PlayerDisplay } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./Envelope.module.css";

export interface EnvelopeProps {
  open?: boolean;
  difficulty?: number;
  totalScore?: number | null;
  paperColor?: TeamColor;
  active?: boolean;
  player?: PlayerDisplay;
  jokerUsed?: boolean;
  onClick?: () => void;
}

const paperClass: Record<TeamColor, string> = {
  red: styles.paperRed,
  blue: styles.paperBlue,
  none: styles.paperNone,
};

export function Envelope({
  open = false,
  difficulty,
  totalScore,
  paperColor,
  active = false,
  player,
  jokerUsed = false,
  onClick,
}: EnvelopeProps) {
  return (
    <div
      className={cn(
        styles.envelope,
        {
          [styles.open]: open,
          [styles.active]: active
        })
      }
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <div className={cn(styles.lid,styles.lidBack)} />
      <div className={cn(styles.letter,paperColor && paperClass[paperColor])}>
        {totalScore != null && <span className={styles.paperText}>
          {totalScore > 0 ? `+${totalScore}` : "—"}
        </span>}
      </div>
      <div className={cn(styles.lid,styles.lidRight)} />
      <div className={cn(styles.lid,styles.lidLeft)} />
      <div className={cn(styles.lid,styles.lidBottom)} />
      <div className={cn(styles.lid,styles.lidTop)} />
      
      {difficulty != null && <span className={styles.label}>{String(difficulty)}</span>}
      {player && (
        <div className={styles.playerOverlay}>
          <PlayerAvatar emoji={player.emoji} team={player.team} />
        </div>
      )}
      {jokerUsed && <div className={styles.jokerOverlay}>🃏</div>}
    </div>
  );
}
