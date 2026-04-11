import { type ReactNode, useEffect, useRef } from "react";
import cn from "classnames";
import styles from "./TimerButton.module.css";
import { Timer } from "@/components/Timer/Timer";

export interface TimerButtonProps {
  startedAt: number; // performance time
  durationMs: number; // milliseconds
  warningTimeMs?: number; // milliseconds
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function TimerButton(
  { startedAt, durationMs, warningTimeMs = 10000, onClick, disabled, children }: TimerButtonProps
) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const endAt = startedAt + durationMs;
    
    let rafId: number;
    function render(progress: number, warning: boolean){
      if (warning) {
        buttonRef.current?.classList?.add(styles.warning);
      } else {
        buttonRef.current?.classList?.remove(styles.warning);
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
  }, [startedAt, durationMs, warningTimeMs]);
  
  return (
    <button
      ref={buttonRef}
      className={cn(styles.button)}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      <Timer startedAt={startedAt} durationMs={durationMs} warningTimeMs={warningTimeMs} />
      <div ref={barRef} className={styles.progressBar} style={{ width: `100%` }} />
    </button>
  );
}
