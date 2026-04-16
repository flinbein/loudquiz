import type { TimerState } from "@/types/game";

export function getCaptainTimerDuration(): number {
  return 60 * 1000;
}

export function getPickTimerDuration(): number {
  return 60 * 1000;
}

export function getActiveTimerDuration(answerersCount: number): number {
  return (55 + 5 * answerersCount) * 1000;
}

export function getAnswerTimerDuration(): number {
  return 20 * 1000;
}

// --- Blitz-specific timers (see spec/game/blitz.md) ---

export function getBlitzCaptainTimerDuration(): number {
  return 60 * 1000;
}

export function getBlitzPickTimerDuration(): number {
  return 60 * 1000;
}

/**
 * `10с + 20с × responders_count` — 5s reading + 20s per hand-off + 5s answer.
 * `respondersCount` is the number of players other than the captain.
 */
export function getBlitzActiveTimerDuration(respondersCount: number): number {
  return (10 + 20 * respondersCount) * 1000;
}

/** `20с + 5с × responders_count` for the fallback answer phase. */
export function getBlitzAnswerTimerDuration(respondersCount: number): number {
  return (20 + 5 * respondersCount) * 1000;
}

export function createTimer(duration: number): TimerState {
  return { startedAt: performance.now(), duration };
}

export function getTopicsSuggestTimerDuration(): number {
  return 60 * 1000;
}