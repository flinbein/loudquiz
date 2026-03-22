export const VIBRATION_PATTERNS = {
  ROUND_START: [200, 100, 200],
  ANSWER_TIME: [300],
  RESULT: [100, 50, 100, 50, 200],
} as const;

export function vibrate(pattern: readonly number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([...pattern]);
    } catch {
      // Vibration API not supported or blocked
    }
  }
}
