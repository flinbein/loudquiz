import { type InputHTMLAttributes, useEffect, useRef } from "react";
import cn from "classnames";
import styles from "./TimerInput.module.css";
import { Timer } from "@/components/Timer/Timer";

export interface TimerInputProps extends InputHTMLAttributes<HTMLInputElement> {
  startedAt: number; // performance time
  durationMs: number; // milliseconds
  warningTimeMs?: number; // milliseconds
}

export function TimerInput({ startedAt, durationMs, warningTimeMs =10000, className, ...inputProps }: TimerInputProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const endAt = startedAt + durationMs;
    
    let rafId: number;
    function render(progress: number, warning: boolean){
      if (warning) {
        wrapperRef.current?.classList?.add(styles.warning!);
      } else {
        wrapperRef.current?.classList?.remove(styles.warning!);
      }
      const widthPercent = progress * 100;
      barRef.current!.style.width = `${widthPercent}%`;
    }
    function tick(){
      const now = performance.now();
      if (now >= endAt) {
        render(0, false);
        return;
      }
      const remaining = endAt - now;
      render( Math.min(remaining / durationMs, 1), remaining < warningTimeMs)
      rafId = requestAnimationFrame(tick);
    }
    tick();
    return () => {
      cancelAnimationFrame(rafId);
    }
  }, [startedAt, durationMs, warningTimeMs])
  
  return (
    <div ref={wrapperRef} className={cn(styles.wrapper, className)}>
      <input className={styles.input} {...inputProps} />
      <Timer startedAt={startedAt} durationMs={durationMs} warningTimeMs={warningTimeMs} />
      <div ref={barRef} className={styles.progressBar} style={{ width: `100%` }} />
    </div>
  );
}
