import type { NominationRule } from "../types";

export const captainsDaughterRule: NominationRule = {
  id: "captainsDaughter",
  emoji: "👑",
  titleKey: "finale.nomination.captainsDaughter.title",
  descriptionKey: "finale.nomination.captainsDaughter.description",
  tieStrategy: "skip",
  compute(ctx) {
    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      // Collect non-captain players with valid answer times
      const eligible = round.playerResults.filter(
        (pr) =>
          pr.playerName !== round.captainName &&
          pr.answerText !== "" &&
          pr.answerTime !== Infinity,
      );

      if (eligible.length === 0) continue;

      const minTime = Math.min(...eligible.map((pr) => pr.answerTime));
      const fastest = eligible.filter((pr) => pr.answerTime === minTime);

      // Only credit if there is a single fastest player
      if (fastest.length === 1) {
        const name = fastest[0]!.playerName;
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
