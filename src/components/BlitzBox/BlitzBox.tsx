import type { TeamColor } from "@/types/game";
import styles from "./BlitzBox.module.css";

export interface BlitzBoxProps {
  active?: boolean;
  teamColor?: TeamColor;
  text?: string;
  onClick?: () => void;
}

const textColorClass: Record<TeamColor, string> = {
  red: styles.textRed,
  blue: styles.textBlue,
  beige: styles.textBeige,
};

export function BlitzBox({
  active = false,
  teamColor,
  text = "?",
  onClick,
}: BlitzBoxProps) {
  const boxCls = [styles.box, active && styles.active]
    .filter(Boolean)
    .join(" ");

  const textCls = [styles.text, teamColor && textColorClass[teamColor]]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={boxCls}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <span className={textCls}>{text}</span>
    </div>
  );
}
