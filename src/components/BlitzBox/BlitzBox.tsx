import type { TeamColor } from "@/types/game";
import styles from "./BlitzBox.module.css";

export interface BlitzBoxProps {
  active?: boolean;
  team?: TeamColor;
  score?: number | null;
  onClick?: () => void;
}

const textColorClass: Record<TeamColor, string> = {
  red: styles.textRed,
  blue: styles.textBlue,
  none: styles.textNone,
};

export function BlitzBox({
  active = false,
  team,
  score,
  onClick,
}: BlitzBoxProps) {
  const boxCls = [styles.box, active && styles.active]
    .filter(Boolean)
    .join(" ");

  const textCls = [styles.text, team && textColorClass[team]]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={boxCls}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <div className={`${styles.plank} ${styles.plankDiag}`}></div>
      <div className={`${styles.plank} ${styles.plankLeft}`}></div>
      <div className={`${styles.plank} ${styles.plankRight}`}></div>
      <div className={`${styles.plank} ${styles.plankBottom}`}></div>
      <div className={`${styles.plank} ${styles.plankTop}`}></div>
      <span className={textCls}>
        {(score == null) ? "?" : (
          score === 0 ? "—" : `+${score}`
        )}
      </span>
    </div>
  );
}
