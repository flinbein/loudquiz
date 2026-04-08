import type { PlayerAnswer, AnswerEvaluation } from "@/types/game";

export function calculateRoundScore(
  difficulty: number,
  correctCount: number,
  jokerActive: boolean,
  bonusMultiplier: number,
): number {
  if (correctCount === 0) return 0;
  const jokerMul = jokerActive ? 2 : 1;
  const bonusMul = bonusMultiplier > 0 ? bonusMultiplier : 1;
  return Math.round(difficulty * correctCount * jokerMul * bonusMul);
}

export function calculateBonusMultiplier(
  bonusTime: number,
  totalTime: number,
): number {
  if (bonusTime <= 0 || totalTime <= 0) return 0;
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
  // timestamps are absolute (Date.now()), timerStartedAt is absolute
  const timerEndAt = timerStartedAt + activeDuration * 1000;
  const maxTimestamp = Math.max(...Object.values(answers).map((a) => a.timestamp));
  const bonusTime = Math.max(0, (timerEndAt - maxTimestamp) / 1000);
  return { hasBonus: true, bonusTime };
}
