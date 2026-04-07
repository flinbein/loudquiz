import type { TimerState } from "@/types/game";

export function getCaptainTimerDuration(): number {
  return 60;
}

export function getPickTimerDuration(): number {
  return 60;
}

export function getActiveTimerDuration(respondersCount: number): number {
  return 50 + 5 * respondersCount;
}

export function getAnswerTimerDuration(): number {
  return 20;
}

export function createTimer(duration: number): TimerState {
  return { startedAt: Date.now(), duration };
}

export function getRemainingTime(timer: TimerState): number {
  const elapsed = (Date.now() - timer.startedAt) / 1000;
  return Math.max(0, timer.duration - elapsed);
}
