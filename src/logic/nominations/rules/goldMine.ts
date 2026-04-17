import type { NominationRule } from "../types";

export const goldMineRule: NominationRule = {
  id: "goldMine",
  emoji: "💰",
  titleKey: "finale.nomination.goldMine.title",
  descriptionKey: "finale.nomination.goldMine.description",
  tieStrategy: "skip",
  compute(ctx) {
    const totals = new Map<string, number>();

    for (const round of ctx.history) {
      if (!round.captainName) continue;
      const prev = totals.get(round.captainName) ?? 0;
      totals.set(round.captainName, prev + round.score);
    }

    if (totals.size === 0) return null;

    const candidates = Array.from(totals.entries()).map(([playerName, total]) => ({
      playerName,
      value: total,
      statLabel: String(total),
    }));

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
