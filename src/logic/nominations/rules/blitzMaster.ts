import type { NominationRule } from "../types";

export const blitzMasterRule: NominationRule = {
  id: "blitzMaster",
  emoji: "🔥",
  titleKey: "finale.nomination.blitzMaster.title",
  descriptionKey: "finale.nomination.blitzMaster.description",
  tieStrategy: "skip",
  compute(ctx) {
    const blitzRounds = ctx.history.filter((r) => r.type === "blitz");
    if (blitzRounds.length === 0) return null;

    const playerScores = new Map<string, number>();

    for (const round of blitzRounds) {
      const prev = playerScores.get(round.captainName) ?? 0;
      playerScores.set(round.captainName, prev + round.score);
    }

    if (playerScores.size === 0) return null;

    const candidates = Array.from(playerScores.entries()).map(([playerName, score]) => ({
      playerName,
      value: score,
      statLabel: String(score),
    }));

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
