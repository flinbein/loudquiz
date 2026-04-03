import type { TeamColor } from "@/types/game";
import { Envelope, type EnvelopePlayer } from "@/components/Envelope/Envelope";
import { BlitzBox } from "@/components/BlitzBox/BlitzBox";
import styles from "./TaskView.module.css";

export interface TaskViewQuestion {
  open: boolean;
  active: boolean;
  player?: EnvelopePlayer;
  jokerUsed: boolean;
  label: string;
  paperText?: string;
  paperColor?: TeamColor;
}

export interface TaskViewTopic {
  name: string;
  questions: TaskViewQuestion[];
}

export interface TaskViewBlitz {
  active: boolean;
  teamColor?: TeamColor;
  text?: string;
}

export interface TaskViewProps {
  topics: TaskViewTopic[];
  blitzRounds: TaskViewBlitz[];
  onSelectQuestion?: (topicIndex: number, questionIndex: number) => void;
  onSelectBlitz?: (blitzIndex: number) => void;
}

export function TaskView({
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
        <>
          {Array.from({ length: maxRows }, (_, row) => (
            <div key={row} className={styles.grid} style={{ gridTemplateColumns: gridCols }}>
              {topics.map((topic, ti) => {
                const q = topic.questions[row];
                if (!q) return <div key={ti} className={styles.cell} />;
                return (
                  <div key={ti} className={styles.cell}>
                    <Envelope
                      open={q.open}
                      label={q.label}
                      paperText={q.paperText}
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
                );
              })}
            </div>
          ))}
        </>
      )}

      {blitzRounds.length > 0 && (
        <div className={styles.blitzRow}>
          {blitzRounds.map((blitz, bi) => (
            <div key={bi} className={styles.blitzCell}>
              <BlitzBox
                active={blitz.active}
                teamColor={blitz.teamColor}
                text={blitz.text}
                onClick={onSelectBlitz ? () => onSelectBlitz(bi) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
