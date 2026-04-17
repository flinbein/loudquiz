import type { NominationRule } from "../types";

export const quickDrawRule: NominationRule = {
  id: "quickDraw",
  emoji: "⚡",
  titleKey: "finale.nomination.quickDraw.title",
  descriptionKey: "finale.nomination.quickDraw.description",
  tieStrategy: "skip",
  compute(ctx) {
    const playerTimes = new Map<string, { sum: number; count: number }>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        if (pr.playerName === round.captainName) continue;
        if (pr.answerText === "") continue;
        if (pr.answerTime === Infinity) continue;

        const entry = playerTimes.get(pr.playerName) ?? { sum: 0, count: 0 };
        entry.sum += pr.answerTime;
        entry.count += 1;
        playerTimes.set(pr.playerName, entry);
      }
    }

    if (playerTimes.size === 0) return null;

    const candidates = Array.from(playerTimes.entries())
      .filter(([, e]) => e.count > 0)
      .map(([playerName, e]) => {
        const avgTime = e.sum / e.count;
        const avgSeconds = avgTime / 1000;
        return {
          playerName,
          value: -avgTime, // negative so fastest (lowest time) = highest value
          statLabel: `${avgSeconds.toFixed(1)}s`,
        };
      });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
