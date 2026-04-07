import { type Ref, type ReactNode } from "react";
import cn from "classnames";
import { useCountdown, type CountdownHandle } from "@/hooks/useCountdown";
import styles from "./TimerButton.module.css";

export interface TimerButtonProps {
  time: number;
  warningTime?: number;
  ref?: Ref<CountdownHandle>;
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function TimerButton({ time, warningTime = 10, ref, onClick, disabled, children }: TimerButtonProps) {
  const { formatted, progress, isWarning } = useCountdown(time, warningTime, ref);

  return (
    <button
      className={cn(styles.button, { [styles.warning]: isWarning })}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      <span className={styles.time}>{formatted}</span>
      <div className={styles.progressBar} style={{ width: `${progress * 100}%` }} />
    </button>
  );
}
