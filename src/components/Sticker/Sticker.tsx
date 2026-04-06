import { useMemo } from "react";
import cn from "classnames";
import type { TeamColor, PlayerDisplay } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./Sticker.module.css";

export interface StickerProps {
  player?: PlayerDisplay;
  answerText: string;
  aiComment?: string;
  stampText?: string;
  hideAvatar?: boolean;
  stampColor?: "green" | "red";
  onClickSticker?: () => void;
  onClickAvatar?: () => void;
}

const teamClass: Partial<Record<TeamColor, string>> = {
  red: styles.teamRed,
  blue: styles.teamBlue,
  // "none" — default beige sticker, no modifier class needed
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
  onClickSticker,
  onClickAvatar,
  hideAvatar = false,
}: StickerProps) {
  const rotation = useMemo(() => randomRange(-4, 4), []);
  const stampRotation = useMemo(() => randomRange(-10, 10), []);
  const team = player?.team;

  return (
    <div
      className={cn(styles.wrapper, team && teamClass[team])}
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      {/* Player avatar — on wrapper, not clipped */}
      {player && !hideAvatar && (
        <div className={styles.playerOverlay}>
          <PlayerAvatar emoji={player.emoji} team={player.team} onClick={onClickAvatar} />
        </div>
      )}

      {/* Sticker body — clipped */}
      <div className={styles.sticker} onClick={onClickSticker} data-clickable={onClickSticker ? "true" : undefined}>
        <div className={styles.tape} />
        <div className={styles.content}>
          <p className={styles.answerText}><span>&nbsp;</span>{answerText}</p>
          {aiComment && <p className={styles.aiComment}>{aiComment}</p>}
        </div>
        <div className={styles.stampArea}>
          {stampText && (
            <div
              className={`${styles.stamp} ${stampColorClass[stampColor]}`}
              style={{ "--stamp-rotation": `${stampRotation}deg` } as React.CSSProperties}
            >
              {stampText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
