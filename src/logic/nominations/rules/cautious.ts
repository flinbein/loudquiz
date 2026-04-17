import type { NominationRule } from "../types";

export const cautiousRule: NominationRule = {
  id: "cautious",
  emoji: "🐢",
  titleKey: "finale.nomination.cautious.title",
  descriptionKey: "finale.nomination.cautious.description",
  tieStrategy: "skip",
  compute(ctx) {
    const data = new Map<string, { total: number; count: number }>();

    for (const round of ctx.history) {
      if (round.type !== "round") continue;
      if (!round.captainName) continue;
      const entry = data.get(round.captainName) ?? { total: 0, count: 0 };
      entry.total += round.difficulty;
      entry.count += 1;
      data.set(round.captainName, entry);
    }

    if (data.size === 0) return null;

    // value is negated so highest value = lowest avg difficulty wins
    const candidates = Array.from(data.entries()).map(([playerName, { total, count }]) => {
      const avg = total / count;
      return {
        playerName,
        value: -avg,
        statLabel: String(Math.round(avg)),
      };
    });

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
