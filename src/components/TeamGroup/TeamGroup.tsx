import type { TeamId } from "@/types/game";
import styles from "./TeamGroup.module.css";

const colorClass: Record<TeamId, string> = {
  red: styles.red!,
  blue: styles.blue!,
  none: styles.none!,
};

export interface TeamGroupProps {
  label: string;
  teamColor: TeamId;
  playerCount: number;
  children: React.ReactNode;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function TeamGroup({
  label,
  teamColor,
  playerCount,
  children,
  onDragOver,
  onDrop,
}: TeamGroupProps) {
  return (
    <div
      className={`${styles.group} ${colorClass[teamColor]}`}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={styles.count}>{playerCount}</span>
      </div>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
