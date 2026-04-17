import type { ReactNode } from "react";
import type { TeamId, PlayerDisplay } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./TaskCard.module.css";

export interface TaskCardProps {
  player?: PlayerDisplay;
  topic?: ReactNode;
  bottomText: ReactNode;
  hidden?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}

const nameColorClass: Record<TeamId, string> = {
  red: styles.captainNameRed!,
  blue: styles.captainNameBlue!,
  none: styles.captainNameNone!,
};

export function TaskCard({
  topic,
  player,
  bottomText,
  children,
  hidden = false,
  onClick,
}: TaskCardProps) {
  return (
    <div
      className={styles.wrapper}
      data-hidden={hidden}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <div className={styles.card}>
        {topic && <div className={styles.header}>{topic}</div>}
        <div className={styles.body}>
          {player && (
            <div className={styles.captain}>
              <PlayerAvatar size={72} emoji={player.emoji} team={player.team} />
              <span className={`${styles.captainName} ${nameColorClass[player.team]}`}>
                {player.name}
              </span>
            </div>
          )}
          <div className={styles.question}>
            {children}
          </div>
        </div>
        <div className={styles.footer}>{bottomText}</div>
      </div>

      <div className={`${styles.card} ${styles.back}`}>
        {topic && <div className={styles.header}>{topic}</div>}
        <div className={styles.body}>
          {player && (
            <div className={styles.captain}>
              <PlayerAvatar size={72} emoji={player.emoji} team={player.team} />
              <span className={`${styles.captainName} ${nameColorClass[player.team]}`}>
                {player.name}
              </span>
            </div>
          )}
        </div>
        <div className={styles.footer}>{bottomText}</div>
      </div>
    </div>
  );
}
