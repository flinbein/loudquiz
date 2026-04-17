import type { NominationRule } from "../types";

export const longestAnswerRule: NominationRule = {
  id: "longestAnswer",
  emoji: "📜",
  titleKey: "finale.nomination.longestAnswer.title",
  descriptionKey: "finale.nomination.longestAnswer.description",
  tieStrategy: "random",
  compute(ctx) {
    const playerLengths = new Map<string, { sum: number; count: number }>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        if (pr.answerText === "") continue;
        const entry = playerLengths.get(pr.playerName) ?? { sum: 0, count: 0 };
        entry.sum += pr.answerText.length;
        entry.count += 1;
        playerLengths.set(pr.playerName, entry);
      }
    }

    if (playerLengths.size === 0) return null;

    const candidates = Array.from(playerLengths.entries())
      .filter(([, e]) => e.count > 0)
      .map(([playerName, e]) => {
        const avg = e.sum / e.count;
        return {
          playerName,
          value: avg,
          statLabel: avg.toFixed(1),
        };
      });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
