import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./Envelope.module.css";

export interface EnvelopePlayer {
  emoji: string;
  playerName: string;
  team: TeamColor;
}

export interface EnvelopeProps {
  open: boolean;
  label: string;
  paperText?: string;
  paperColor?: TeamColor;
  active?: boolean;
  player?: EnvelopePlayer;
  jokerUsed?: boolean;
  onClick?: () => void;
}

const paperClass: Record<TeamColor, string> = {
  red: styles.paperRed,
  blue: styles.paperBlue,
  beige: styles.paperBeige,
};

export function Envelope({
  open,
  label,
  paperText,
  paperColor = "beige",
  active = false,
  player,
  jokerUsed = false,
  onClick,
}: EnvelopeProps) {
  const wrapperCls = [
    styles.wrapper,
    open && styles.open,
    active && styles.active,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapperCls}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <div className={`${styles.lid} ${styles.lidFront}`} />
      <div className={`${styles.lid} ${styles.lidBack}`} />
      <div className={styles.body} />
      <div className={`${styles.letter} ${paperClass[paperColor]}`}>
        {paperText && <span className={styles.paperText}>{paperText}</span>}
      </div>
      <span className={styles.label}>{label}</span>
      {player && (
        <div className={styles.playerOverlay}>
          <PlayerAvatar size="small" emoji={player.emoji} team={player.team} />
        </div>
      )}
      {jokerUsed && <span className={styles.jokerOverlay}>🃏</span>}
    </div>
  );
}
