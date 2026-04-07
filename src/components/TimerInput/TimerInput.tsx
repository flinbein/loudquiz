import { type Ref, type InputHTMLAttributes } from "react";
import cn from "classnames";
import { useCountdown, type CountdownHandle } from "@/hooks/useCountdown";
import styles from "./TimerInput.module.css";

export interface TimerInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "ref"> {
  time: number;
  warningTime?: number;
  ref?: Ref<CountdownHandle>;
}

export function TimerInput({ time, warningTime = 10, ref, className, ...inputProps }: TimerInputProps) {
  const { formatted, progress, isWarning } = useCountdown(time, warningTime, ref);

  return (
    <div className={cn(styles.wrapper, { [styles.warning]: isWarning }, className)}>
      <input className={styles.input} {...inputProps} />
      <span className={styles.time}>{formatted}</span>
      <div className={styles.progressBar} style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
