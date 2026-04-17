import type { NominationRule } from "../types";

export const stuckRecordRule: NominationRule = {
  id: "stuckRecord",
  emoji: "💿",
  titleKey: "finale.nomination.stuckRecord.title",
  descriptionKey: "finale.nomination.stuckRecord.description",
  tieStrategy: "skip",
  compute(ctx) {
    // For each player, track answer texts with their correctness
    const playerAnswers = new Map<string, Map<string, { count: number; hasCorrect: boolean }>>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        const trimmed = pr.answerText.trim().toLowerCase();
        if (trimmed === "") continue;

        const answers = playerAnswers.get(pr.playerName) ?? new Map<string, { count: number; hasCorrect: boolean }>();
        const entry = answers.get(trimmed) ?? { count: 0, hasCorrect: false };
        entry.count += 1;
        if (pr.correct === true) entry.hasCorrect = true;
        answers.set(trimmed, entry);
        playerAnswers.set(pr.playerName, answers);
      }
    }

    if (playerAnswers.size === 0) return null;

    const candidates: Array<{ playerName: string; value: number; statLabel: string }> = [];

    for (const [playerName, answers] of playerAnswers.entries()) {
      // Find the most repeated answer
      let maxCount = 0;
      let hasCorrectOnMax = false;

      for (const { count, hasCorrect } of answers.values()) {
        if (count > maxCount) {
          maxCount = count;
          hasCorrectOnMax = hasCorrect;
        }
      }

      // Only include if repeated at least once (count >= 2) and has at least one correct instance
      if (maxCount >= 2 && hasCorrectOnMax) {
        candidates.push({
          playerName,
          value: maxCount,
          statLabel: String(maxCount),
        });
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
