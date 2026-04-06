import { useEffect, useRef, useState } from "react";
import type { TeamColor } from "@/types/game";
import styles from "./PlayerAvatar.module.css";
import cn from "classnames";
import { Property } from "csstype";

export interface PlayerAvatarProps {
  emoji: string;
  playerName?: string;
  team?: TeamColor;
  size?: Property.Height<string | number>; // size in px
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
  none: styles.teamNone,
};

export function PlayerAvatar({
  emoji,
  size,
  playerName,
  team,
  online = true,
  onClick,
}: PlayerAvatarProps) {
  const [displayedEmoji, setDisplayedEmoji] = useState(emoji);
  const [animatingEmoji, setAnimatingEmoji] = useState(false);
  const prevEmojiRef = useRef(emoji);

  useEffect(() => {
    if (emoji !== prevEmojiRef.current) {
      setAnimatingEmoji(true);
      const timer = setTimeout(() => {
        setDisplayedEmoji(emoji);
        setAnimatingEmoji(false);
      }, 300);
      prevEmojiRef.current = emoji;
      return () => clearTimeout(timer);
    }
  }, [emoji]);
  
  const [teamStatus, setTeamStatus] = useState({team, online});
  const [animatingTeamStatus, setAnimatingTeamStatus] = useState(false);
  useEffect(() => {
    if (teamStatus.team === team && teamStatus.online === online) {
      setAnimatingTeamStatus(false);
      return;
    }
    setAnimatingTeamStatus(true);
    const timer = setTimeout(() => {
      setTeamStatus({team, online});
      setAnimatingTeamStatus(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [team, online]);
  
  return (
    <div className={styles.container} style={{height: size || undefined, width: size || undefined}}>
      <div
        className={cn(
          styles.avatar,
          teamStatus.team && teamClass[teamStatus.team],
          {
            [styles.offline]:!teamStatus.online,
            [styles.avatarAnimate]: animatingTeamStatus,
          }
        )}
        data-clickable={onClick ? "true" : undefined}
        onClick={onClick}
      >
        <div className={cn(styles.inner)}>
          <div className={styles.emojiWrap}>
            <span className={`${styles.emoji} ${animatingEmoji ? styles.emojiExit : ""}`}>
              {displayedEmoji}
            </span>
            {animatingEmoji && (
              <span className={`${styles.emoji} ${styles.emojiEnter}`}>
                {emoji}
              </span>
            )}
          </div>
        </div>
        {playerName && <span className={styles.name}>{formatName(playerName)}</span>}
      </div>
    </div>
  );
}
