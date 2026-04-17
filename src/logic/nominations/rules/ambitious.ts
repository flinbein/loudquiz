import type { NominationRule } from "../types";

export const ambitiousRule: NominationRule = {
  id: "ambitious",
  emoji: "🚀",
  titleKey: "finale.nomination.ambitious.title",
  descriptionKey: "finale.nomination.ambitious.description",
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

    const candidates = Array.from(data.entries()).map(([playerName, { total, count }]) => {
      const avg = total / count;
      return {
        playerName,
        value: avg,
        statLabel: String(Math.round(avg)),
      };
    });

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
