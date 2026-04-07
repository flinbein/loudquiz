import cn from "classnames";
import type { TeamColor } from "@/types/game";
import styles from "./TeamScore.module.css";

export interface TeamScoreProps {
  teams: Array<{ id: string; color: TeamColor; score: number }>;
}

export function TeamScore({ teams }: TeamScoreProps) {
  const maxScore = Math.max(...teams.map((t) => t.score));
  const hasLeader = teams.length > 1 && teams.filter((t) => t.score === maxScore).length === 1;

  return (
    <div className={styles.container}>
      {teams.map((team) => (
        <div
          key={team.id}
          className={cn(
            styles.team,
            styles[team.color],
            { [styles.leader]: hasLeader && team.score === maxScore },
          )}
        >
          <span className={styles.score}>{team.score}</span>
          <span className={styles.coin}>🪙</span>
        </div>
      ))}
    </div>
  );
}
