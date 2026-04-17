import type { NominationRule } from "../types";

export const flawlessRule: NominationRule = {
  id: "flawless",
  emoji: "✨",
  titleKey: "finale.nomination.flawless.title",
  descriptionKey: "finale.nomination.flawless.description",
  tieStrategy: "all",
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

    const candidates = Array.from(totals.entries())
      .filter(([, e]) => e.total > 0 && e.correct === e.total)
      .map(([playerName]) => ({
        playerName,
        value: 1,
        statLabel: "100%",
      }));

    if (candidates.length === 0) return null;

    return candidates;
  },
};
