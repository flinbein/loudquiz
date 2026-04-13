import type { TeamId, PlayerDisplay } from "@/types/game";
import { Envelope } from "@/components/Envelope/Envelope";
import { BlitzBox } from "@/components/BlitzBox/BlitzBox";
import styles from "./TaskBoard.module.css";

export interface TaskViewQuestion {
  open: boolean;
  active: boolean;
  player?: PlayerDisplay;
  jokerUsed: boolean;
  difficulty: number;
  totalScore?: number;
  paperColor?: TeamId;
}

export interface TaskViewTopic {
  name: string;
  questions: TaskViewQuestion[];
}

export interface TaskViewBlitz {
  active: boolean;
  team?: TeamId;
  score?: number;
}

export interface TaskViewProps {
  topics: TaskViewTopic[];
  blitzRounds: TaskViewBlitz[];
  onSelectQuestion?: (topicIndex: number, questionIndex: number) => void;
  onSelectBlitz?: (blitzIndex: number) => void;
}

export function TaskBoard({
  topics,
  blitzRounds,
  onSelectQuestion,
  onSelectBlitz,
}: TaskViewProps) {
  const colCount = topics.length || 1;
  const maxRows = Math.max(1, ...topics.map((t) => t.questions.length));
  const gridCols = `repeat(${colCount}, 1fr)`;

  return (
    <div className={styles.container}>
      {topics.length > 0 && (
        <div className={styles.topicHeaders} style={{ gridTemplateColumns: gridCols }}>
          {topics.map((topic, ti) => (
            <div key={ti} className={styles.topicHeader}>
              {topic.name}
            </div>
          ))}
        </div>
      )}

      {topics.length > 0 && (
        <div className={styles.questionsArea}>
          {Array.from({ length: maxRows }, (_, row) => (
            <div
              key={row}
              className={styles.row}
              style={{ gridTemplateColumns: gridCols, "--cols": colCount } as React.CSSProperties}
            >
              {topics.map((topic, ti) => {
                const q = topic.questions[row];
                if (!q) return <div key={ti} className={styles.cell} />;
                return (
                  <div key={ti} className={styles.cell}>
                    <div className={styles.envelopeFit}>
                      <Envelope
                        open={q.open}
                        difficulty={q.difficulty}
                        totalScore={q.totalScore}
                        paperColor={q.paperColor}
                        active={q.active}
                        player={q.player}
                        jokerUsed={q.jokerUsed}
                        onClick={
                          onSelectQuestion
                            ? () => onSelectQuestion(ti, row)
                            : undefined
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {blitzRounds.length > 0 && (
        <div className={styles.blitzRow}>
          {blitzRounds.map((blitz, bi) => (
            <div key={bi} className={styles.blitzCell}>
              <BlitzBox
                active={blitz.active}
                team={blitz.team}
                score={blitz.score}
                onClick={onSelectBlitz ? () => onSelectBlitz(bi) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
