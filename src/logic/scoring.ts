import type { PlayerAnswer, AnswerEvaluation } from "@/types/game";

export function calculateRoundScore(
  difficulty: number,
  correctCount: number,
  jokerActive: boolean,
  bonusTimeMultiplier: number,
  bonusTimeApplied: boolean,
): number {
  const jokerMul = jokerActive ? 2 : 1;
  const bonusMul = bonusTimeApplied ? bonusTimeMultiplier : 1;
  return Math.round(difficulty * correctCount * jokerMul * bonusMul);
}

export function calculateBonusMultiplier(
  bonusTime: number,
  totalTime: number,
): number {
  if (bonusTime <= 0 || totalTime <= 0) return 1;
  return 1 + bonusTime / totalTime;
}

export function checkBonusConditions(
  answers: Record<string, PlayerAnswer>,
  evaluations: AnswerEvaluation[],
  groups: string[][],
  respondersCount: number,
  activeDuration: number,
  timerStartedAt: number,
): { hasBonus: boolean; bonusTime: number } {
  // 1. All responders answered
  const answeredCount = Object.keys(answers).length;
  if (answeredCount < respondersCount) {
    return { hasBonus: false, bonusTime: 0 };
  }

  // 2. All answers correct (no empty text / gave up)
  const allCorrect = evaluations.every((e) => e.correct === true);
  if (!allCorrect) {
    return { hasBonus: false, bonusTime: 0 };
  }

  // 3. All answers unique (no merged groups — each group has exactly 1 player)
  const allUnique = groups.every((g) => g.length === 1);
  if (!allUnique) {
    return { hasBonus: false, bonusTime: 0 };
  }

  // Bonus time = time remaining when last answer was submitted
  // timestamps are absolute (performance.now()), timerStartedAt is absolute
  const timerEndAt = timerStartedAt + activeDuration;
  const maxTimestamp = Math.max(...Object.values(answers).map((a) => a.timestamp));
  const bonusTime = Math.max(0, (timerEndAt - maxTimestamp));
  return { hasBonus: true, bonusTime };
}

/**
 * Blitz scoring (see spec/game/scoring.md#блиц-раунд):
 *   score = difficulty × playerNumber × (1 + bonusTime / totalTime)
 *
 * - `playerNumber` is the 1-based position of the player who answered,
 *   counting from the first player after the captain (captain → 1 → 2 → ...).
 * - `bonusTime` is only applied if the answer was given during `blitz-active`;
 *   answers from `blitz-answer` get 0 bonus regardless of clock.
 * - Wrong / missing answers score 0.
 */
export function calculateBlitzScore(
  difficulty: number,
  playerNumber: number,
  correct: boolean,
  bonusTime: number,
  totalTime: number,
): number {
  if (!correct || playerNumber <= 0) return 0;
  const bonusMul = calculateBonusMultiplier(bonusTime, totalTime);
  return Math.round(difficulty * playerNumber * bonusMul);
}
