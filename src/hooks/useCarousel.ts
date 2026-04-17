import { useState, useCallback, useEffect, useRef } from "react";

export function useCarousel(totalSlides: number, intervalMs = 8000) {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = prev + 1;
        if (next >= totalSlides - 1) {
          setIsPlaying(false);
          clearInterval(timerRef.current!);
          timerRef.current = null;
        }
        return Math.min(next, totalSlides - 1);
      });
    }, intervalMs);
  }, [totalSlides, intervalMs, clearTimer]);

  useEffect(() => {
    if (isPlaying && current < totalSlides - 1) {
      startTimer();
    }
    return clearTimer;
  }, [isPlaying, startTimer, clearTimer, current, totalSlides]);

  const next = useCallback(() => {
    setCurrent((prev) => {
      const n = Math.min(prev + 1, totalSlides - 1);
      if (n >= totalSlides - 1) setIsPlaying(false);
      return n;
    });
  }, [totalSlides]);

  const prev = useCallback(() => {
    setCurrent((prev) => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback((i: number) => {
    setCurrent(Math.max(0, Math.min(i, totalSlides - 1)));
  }, [totalSlides]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return { current, isPlaying, next, prev, goTo, togglePlay };
}
