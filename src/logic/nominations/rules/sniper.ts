import type { NominationRule } from "../types";

export const sniperRule: NominationRule = {
  id: "sniper",
  emoji: "🎯",
  titleKey: "finale.nomination.sniper.title",
  descriptionKey: "finale.nomination.sniper.description",
  tieStrategy: "skip",
  compute(ctx) {
    const totals = new Map<string, { correct: number; total: number }>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        if (pr.correct === null) continue;
        const entry = totals.get(pr.playerName) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (pr.correct) entry.correct += 1;
        totals.set(pr.playerName, entry);
      }
    }

    if (totals.size === 0) return null;

    const candidates = Array.from(totals.entries())
      .filter(([, e]) => e.total > 0)
      .map(([playerName, e]) => {
        const rate = e.correct / e.total;
        return {
          playerName,
          value: rate,
          statLabel: `${Math.round(rate * 100)}%`,
        };
      });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
