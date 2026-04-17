import type { NominationRule } from "../types";

export const mentalConnectionRule: NominationRule = {
  id: "mentalConnection",
  emoji: "🧠",
  titleKey: "finale.nomination.mentalConnection.title",
  descriptionKey: "finale.nomination.mentalConnection.description",
  tieStrategy: "skip",
  compute(ctx) {
    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        if (pr.correct !== true) continue;
        const group = round.groups[pr.groupIndex];
        if (group && group.length >= 2) {
          counts.set(pr.playerName, (counts.get(pr.playerName) ?? 0) + 1);
        }
      }
    }

    if (counts.size === 0) return null;

    const candidates = Array.from(counts.entries()).map(([playerName, count]) => ({
      playerName,
      value: count,
      statLabel: String(count),
    }));

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
