import { useState, useEffect, useImperativeHandle, useRef, type Ref } from "react";

export interface CountdownHandle {
  setTime(remaining: number): void;
}

export interface CountdownResult {
  remaining: number;
  progress: number;
  isWarning: boolean;
  formatted: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useCountdown(
  time: number,
  warningTime: number = 10,
  ref?: Ref<CountdownHandle>,
): CountdownResult {
  const [remaining, setRemaining] = useState(time);
  const totalRef = useRef(time);

  // Reset when time prop changes
  useEffect(() => {
    setRemaining(time);
    totalRef.current = time;
  }, [time]);

  // Tick every second
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining > 0]);

  // Imperative handle for host sync
  useImperativeHandle(ref, () => ({
    setTime(newRemaining: number) {
      setRemaining(Math.max(0, newRemaining));
    },
  }), []);

  const total = totalRef.current;
  const progress = total > 0 ? remaining / total : 0;
  const isWarning = remaining > 0 && remaining <= warningTime;

  return {
    remaining,
    progress,
    isWarning,
    formatted: formatTime(remaining),
  };
}
