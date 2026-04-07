import { type Ref, type ReactNode } from "react";
import cn from "classnames";
import { useCountdown, type CountdownHandle } from "@/hooks/useCountdown";
import styles from "./Timer.module.css";

export interface TimerProps {
  time: number;
  warningTime?: number;
  ref?: Ref<CountdownHandle>;
  children?: ReactNode;
}

const SIZE = 120;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Timer({ time, warningTime = 10, ref, children }: TimerProps) {
  const { formatted, progress, isWarning } = useCountdown(time, warningTime, ref);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className={cn(styles.container, { [styles.warning]: isWarning })}>
      <div className={styles.ring}>
        <svg width={SIZE} height={SIZE}>
          <circle className={styles.trackCircle} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
          <circle
            className={styles.progressCircle}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className={styles.time}>{formatted}</span>
      </div>
      {children && <div className={styles.children}>{children}</div>}
    </div>
  );
}
