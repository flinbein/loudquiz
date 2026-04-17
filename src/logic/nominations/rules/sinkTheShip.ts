import type { NominationRule } from "../types";

export const sinkTheShipRule: NominationRule = {
  id: "sinkTheShip",
  emoji: "🚢",
  titleKey: "finale.nomination.sinkTheShip.title",
  descriptionKey: "finale.nomination.sinkTheShip.description",
  tieStrategy: "skip",
  compute(ctx) {
    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      // Only count evaluated players (correct !== null)
      const evaluated = round.playerResults.filter((pr) => pr.correct !== null);

      if (evaluated.length < 2) continue;

      const incorrect = evaluated.filter((pr) => pr.correct === false);
      const correct = evaluated.filter((pr) => pr.correct === true);

      // Exactly one incorrect, all others correct
      if (incorrect.length === 1 && correct.length === evaluated.length - 1) {
        const name = incorrect[0]!.playerName;
        counts.set(name, (counts.get(name) ?? 0) + 1);
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
