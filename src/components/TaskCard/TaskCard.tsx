import type { TeamColor, PlayerDisplay } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./TaskCard.module.css";

export interface TaskCardProps {
  topic?: string;
  player?: PlayerDisplay;
  difficulty: number;
  questionScore: string;
  hidden?: boolean;
  onClick?: () => void;
}

const nameColorClass: Record<TeamColor, string> = {
  red: styles.captainNameRed,
  blue: styles.captainNameBlue,
  none: styles.captainNameNone,
};

export function TaskCard({
  topic,
  player,
  difficulty,
  questionScore,
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
                {player.playerName}
              </span>
            </div>
          )}
          <div className={styles.question}>
            {questionScore}
          </div>
        </div>
        <div className={styles.footer}>{difficulty}</div>
      </div>

      <div className={`${styles.card} ${styles.back}`}>
        {topic && <div className={styles.header}>{topic}</div>}
        <div className={styles.body}>
          {player && (
            <div className={styles.captain}>
              <PlayerAvatar size={72} emoji={player.emoji} team={player.team} />
              <span className={`${styles.captainName} ${nameColorClass[player.team]}`}>
                {player.playerName}
              </span>
            </div>
          )}
        </div>
        <div className={styles.footer}>{difficulty}</div>
      </div>
    </div>
  );
}
