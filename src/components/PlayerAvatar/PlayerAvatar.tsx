import { useEffect, useRef, useState } from "react";
import type { TeamColor } from "@/types/game";
import styles from "./PlayerAvatar.module.css";

export interface PlayerAvatarProps {
  size: "small" | "medium" | "large";
  emoji: string;
  playerName?: string;
  team?: TeamColor;
  online?: boolean;
  onClick?: () => void;
}

function formatName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 3).toUpperCase();
}

const teamClass: Record<TeamColor, string> = {
  red: styles.teamRed,
  blue: styles.teamBlue,
  beige: styles.teamBeige,
};

export function PlayerAvatar({
  size,
  emoji,
  playerName,
  team = "beige",
  online = true,
  onClick,
}: PlayerAvatarProps) {
  const [displayedEmoji, setDisplayedEmoji] = useState(emoji);
  const [animating, setAnimating] = useState(false);
  const prevEmojiRef = useRef(emoji);

  useEffect(() => {
    if (emoji !== prevEmojiRef.current) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setDisplayedEmoji(emoji);
        setAnimating(false);
      }, 300);
      prevEmojiRef.current = emoji;
      return () => clearTimeout(timer);
    }
  }, [emoji]);

  const showName = size !== "small" && playerName;
  const cls = [
    styles.avatar,
    styles[size],
    teamClass[team],
    !online && styles.offline,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <div className={styles.emojiWrap}>
        <span
          className={`${styles.emoji} ${animating ? styles.emojiExit : ""}`}
          key={`prev-${displayedEmoji}`}
        >
          {displayedEmoji}
        </span>
        {animating && (
          <span className={`${styles.emoji} ${styles.emojiEnter}`}>
            {emoji}
          </span>
        )}
      </div>
      {showName && <span className={styles.name}>{formatName(playerName)}</span>}
    </div>
  );
}
