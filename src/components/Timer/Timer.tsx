import { memo, useEffect, useRef } from "react";
import styles from "./Timer.module.css";

export interface TimerProps {
  startedAt: number; // performance time
  durationMs: number; // milliseconds
  warningTimeMs?: number; // milliseconds
}

export const Timer = memo(({ startedAt, durationMs, warningTimeMs = 10000 }: TimerProps) => {
  const timeWrapperRef = useRef<HTMLSpanElement>(null);
  const timeMinutesRef = useRef<HTMLSpanElement>(null);
  const timeSecondsRef = useRef<HTMLSpanElement>(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    const wrapperElement = timeWrapperRef.current;
    const minutesElement = timeMinutesRef.current;
    const secondsElement = timeSecondsRef.current;
    if (!wrapperElement || !minutesElement || !secondsElement) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const endAt = startedAt + durationMs;
    secondsRef.current = Math.max(0, Math.ceil((endAt - performance.now()) / 1000));

    const render = () => {
      
      const m = Math.floor(secondsRef.current / 60);
      const s = Math.floor(secondsRef.current % 60);
      minutesElement.textContent = String(m).padStart(2, "0")
      secondsElement.textContent = String(s).padStart(2, "0")
      if (secondsRef.current > 0 && secondsRef.current * 1000 <= warningTimeMs) {
        wrapperElement.classList.add(styles.warning);
      } else {
        wrapperElement.classList.remove(styles.warning);
      }
      
      if (secondsRef.current > 0) {
        wrapperElement.classList.remove(styles.expired);
      } else {
        wrapperElement.classList.add(styles.expired);
      }
    };

    const tick = () => {
      secondsRef.current = Math.max(0, secondsRef.current - 1);
      render();
      if (secondsRef.current <= 0) return;
      // Align next tick to the real remaining time until the next second boundary
      const remainingMs = Math.max(0, endAt - performance.now());
      const delay = remainingMs - (secondsRef.current - 1) * 1000;
      timeoutId = setTimeout(tick, Math.max(0, delay));
    };

    render();
    if (secondsRef.current > 0) {
      const remainingMs = Math.max(0, endAt - performance.now());
      const delay = remainingMs - (secondsRef.current - 1) * 1000;
      timeoutId = setTimeout(tick, Math.max(0, delay));
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [startedAt, durationMs, warningTimeMs]);

  return <span className={styles.timer} ref={timeWrapperRef}>
    <span ref={timeMinutesRef}>00</span>
    <span className={styles.separator}>:</span>
    <span ref={timeSecondsRef}>00</span>
  </span>;
});
