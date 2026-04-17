import type { NominationRule } from "../types";

export const interviewerRule: NominationRule = {
  id: "interviewer",
  emoji: "❓",
  titleKey: "finale.nomination.interviewer.title",
  descriptionKey: "finale.nomination.interviewer.description",
  tieStrategy: "all",
  compute(ctx) {
    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        const count = (pr.answerText.match(/\?/g) ?? []).length;
        if (count > 0) {
          counts.set(pr.playerName, (counts.get(pr.playerName) ?? 0) + count);
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
