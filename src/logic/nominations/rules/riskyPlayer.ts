import type { NominationRule } from "../types";

export const riskyPlayerRule: NominationRule = {
  id: "riskyPlayer",
  emoji: "🎲",
  titleKey: "finale.nomination.riskyPlayer.title",
  descriptionKey: "finale.nomination.riskyPlayer.description",
  tieStrategy: "all",
  compute(ctx) {
    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      if (!round.jokerUsed) continue;
      if (!round.captainName) continue;

      // Check players that are in a unique group (group of size 1)
      const uniquePlayers = round.playerResults.filter(
        (pr) => pr.groupIndex >= 0 && (round.groups[pr.groupIndex]?.length ?? 0) === 1,
      );

      if (uniquePlayers.length === 0) continue;

      const correctUnique = uniquePlayers.filter((pr) => pr.correct === true).length;
      const successRate = correctUnique / uniquePlayers.length;

      if (successRate > 0.5) {
        counts.set(round.captainName, (counts.get(round.captainName) ?? 0) + 1);
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
