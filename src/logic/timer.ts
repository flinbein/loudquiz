import type { TimerState } from "@/types/game";

export function getCaptainTimerDuration(): number {
  return 60 * 1000;
}

export function getPickTimerDuration(): number {
  return 60 * 1000;
}

export function getActiveTimerDuration(respondersCount: number): number {
  return (55 + 5 * respondersCount) * 1000;
}

export function getAnswerTimerDuration(): number {
  return 20 * 1000;
}

export function createTimer(duration: number): TimerState {
  return { startedAt: performance.now(), duration };
}