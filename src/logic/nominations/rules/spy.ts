import type { NominationRule } from "../types";

export const spyRule: NominationRule = {
  id: "spy",
  emoji: "🕵️",
  titleKey: "finale.nomination.spy.title",
  descriptionKey: "finale.nomination.spy.description",
  tieStrategy: "all",
  compute(ctx) {
    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        if (pr.answerText.length > 3 && /^[^\p{L}\d]+$/u.test(pr.answerText)) {
          counts.set(pr.playerName, (counts.get(pr.playerName) ?? 0) + 1);
        }
      }
    }

    if (counts.size === 0) return null;

    const candidates = Array.from(counts.entries())
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
