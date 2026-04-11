import styles from "./ClockDisplay.module.css";

export interface ClockDisplayProps {
  /** Virtual clock time in ms (already offset-corrected by the caller) */
  timeMs: number;
  /** True for ~80ms after each whole-second boundary */
  pulsing: boolean;
}

export function ClockDisplay({ timeMs, pulsing }: ClockDisplayProps) {
  return (
    <div
      data-testid="clock-display"
      className={`${styles.display} ${pulsing ? styles.pulsing : ""}`}
    >
      {formatMMSS(timeMs)}
    </div>
  );
}

/**
 * Formats a millisecond timestamp to MM:SS wrapped modulo one hour.
 * The epoch doesn't matter — this is a pulse indicator, not a wall clock.
 */
export function formatMMSS(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const min = Math.floor(totalSec / 60) % 60;
  const sec = totalSec % 60;
  return `${pad(min)}:${pad(sec)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
