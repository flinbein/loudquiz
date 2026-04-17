import type { NominationRule } from "../types";

export const eternalCaptainRule: NominationRule = {
  id: "eternalCaptain",
  emoji: "♾️",
  titleKey: "finale.nomination.eternalCaptain.title",
  descriptionKey: "finale.nomination.eternalCaptain.description",
  tieStrategy: "skip",
  compute(ctx) {
    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      if (!round.captainName) continue;
      counts.set(round.captainName, (counts.get(round.captainName) ?? 0) + 1);
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
