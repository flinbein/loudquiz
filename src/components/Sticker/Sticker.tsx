import { useMemo } from "react";
import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./Sticker.module.css";

export interface StickerPlayer {
  emoji: string;
  playerName: string;
  team: TeamColor;
}

export interface StickerProps {
  player?: StickerPlayer;
  answerText: string;
  aiComment?: string;
  stampText?: string;
  stampColor?: "green" | "red";
  onClick?: () => void;
}

const teamClass: Record<TeamColor, string> = {
  red: styles.teamRed,
  blue: styles.teamBlue,
  beige: styles.teamBeige,
};

const stampColorClass = {
  green: styles.stampGreen,
  red: styles.stampRed,
};

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function Sticker({
  player,
  answerText,
  aiComment,
  stampText,
  stampColor = "green",
  onClick,
}: StickerProps) {
  const rotation = useMemo(() => randomRange(-4, 4), []);
  const stampRotation = useMemo(() => randomRange(-10, 10), []);
  const team = player?.team ?? "beige";

  return (
    <div
      className={`${styles.sticker} ${teamClass[team]}`}
      style={{ transform: `rotate(${rotation}deg)` }}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <div className={styles.tape} />
      {player && (
        <div className={styles.playerOverlay}>
          <PlayerAvatar size="small" emoji={player.emoji} team={player.team} />
        </div>
      )}
      <p className={styles.answerText}>{answerText}</p>
      {aiComment && <p className={styles.aiComment}>{aiComment}</p>}
      {stampText && (
        <div
          className={`${styles.stamp} ${stampColorClass[stampColor]}`}
          style={{ "--stamp-rotation": `${stampRotation}deg` } as React.CSSProperties}
        >
          {stampText}
        </div>
      )}
      <div className={styles.foldedCorner} />
    </div>
  );
}
