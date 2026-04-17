import type { NominationRule } from "../types";

export const iDontPlayRule: NominationRule = {
  id: "iDontPlay",
  emoji: "😴",
  titleKey: "finale.nomination.iDontPlay.title",
  descriptionKey: "finale.nomination.iDontPlay.description",
  tieStrategy: "skip",
  compute(ctx) {
    const emptyCounts = new Map<string, number>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        if (pr.answerText === "") {
          emptyCounts.set(pr.playerName, (emptyCounts.get(pr.playerName) ?? 0) + 1);
        } else if (!emptyCounts.has(pr.playerName)) {
          emptyCounts.set(pr.playerName, 0);
        }
      }
    }

    if (emptyCounts.size === 0) return null;

    const candidates = Array.from(emptyCounts.entries())
      .filter(([, count]) => count > 0)
      .map(([playerName, count]) => ({
        playerName,
        value: count,
        statLabel: String(count),
      }));

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
