import { type ReactNode, useEffect, useRef } from "react";
import cn from "classnames";
import styles from "./CircleTimer.module.css";
import { Timer } from "@/components/Timer/Timer";

export interface CircleTimerProps {
  startedAt: number; // performance time
  durationMs: number; // milliseconds
  warningTimeMs?: number; // milliseconds
  children?: ReactNode;
}

const SIZE = 120;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CircleTimer({ startedAt, durationMs, warningTimeMs = 10000, children }: CircleTimerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);
  
  useEffect(() => {
    const endAt = startedAt + durationMs;

    let rafId: number;
    function render(progress: number, warning: boolean){
      if (warning) {
        containerRef.current?.classList?.add(styles.warning);
      } else {
        containerRef.current?.classList?.remove(styles.warning);
      }
      circleRef.current?.setAttribute(
        "stroke-dashoffset",
        String(CIRCUMFERENCE * (1 - progress))
      );
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
    <div className={cn(styles.container)} ref={containerRef}>
      <div className={styles.ring}>
        <svg width={SIZE} height={SIZE}>
          <circle className={styles.trackCircle} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
          <circle
            ref={circleRef}
            className={styles.progressCircle}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={0}
          />
        </svg>
        <div className={styles.time}>
          <Timer startedAt={startedAt} durationMs={durationMs} warningTimeMs={warningTimeMs} />
        </div>
      </div>
      {children && <div className={styles.children}>{children}</div>}
    </div>
  );
}
