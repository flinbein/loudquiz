import type { NominationRule } from "../types";

export const captainFailRule: NominationRule = {
  id: "captainFail",
  emoji: "😬",
  titleKey: "finale.nomination.captainFail.title",
  descriptionKey: "finale.nomination.captainFail.description",
  tieStrategy: "skip",
  compute(ctx) {
    const totals = new Map<string, number>();

    for (const round of ctx.history) {
      if (!round.captainName) continue;
      const prev = totals.get(round.captainName) ?? 0;
      totals.set(round.captainName, prev + round.score);
    }

    if (totals.size === 0) return null;

    // value is negated so highest value = lowest score wins
    const candidates = Array.from(totals.entries()).map(([playerName, total]) => ({
      playerName,
      value: -total,
      statLabel: String(total),
    }));

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
