import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./TaskCard.module.css";

export interface TaskCardPlayer {
  emoji: string;
  playerName: string;
  team: TeamColor;
}

export interface TaskCardProps {
  topic?: string;
  player?: TaskCardPlayer;
  difficulty: number;
  questionText: string;
  hidden?: boolean;
  onClick?: () => void;
}

const nameColorClass: Record<TeamColor, string> = {
  red: styles.captainNameRed,
  blue: styles.captainNameBlue,
  beige: styles.captainNameBeige,
};

export function TaskCard({
  topic,
  player,
  difficulty,
  questionText,
  hidden = false,
  onClick,
}: TaskCardProps) {
  return (
    <div
      className={styles.card}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      {topic && <div className={styles.header}>{topic}</div>}
      <div className={styles.body}>
        {player && (
          <div className={styles.captain}>
            <PlayerAvatar size="large" emoji={player.emoji} team={player.team} />
            <span className={`${styles.captainName} ${nameColorClass[player.team]}`}>
              {player.playerName}
            </span>
          </div>
        )}
        <div className={`${styles.question} ${hidden ? styles.hidden : ""}`}>
          {questionText}
        </div>
      </div>
      <div className={styles.footer}>{difficulty}</div>
    </div>
  );
}
