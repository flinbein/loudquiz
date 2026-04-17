import type { NominationRule } from "../types";

export const typewriterRule: NominationRule = {
  id: "typewriter",
  emoji: "⌨️",
  titleKey: "finale.nomination.typewriter.title",
  descriptionKey: "finale.nomination.typewriter.description",
  tieStrategy: "random",
  compute(ctx) {
    const playerTotals = new Map<string, number>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        playerTotals.set(pr.playerName, (playerTotals.get(pr.playerName) ?? 0) + pr.answerText.length);
      }
    }

    if (playerTotals.size === 0) return null;

    const candidates = Array.from(playerTotals.entries()).map(([playerName, total]) => ({
      playerName,
      value: total,
      statLabel: String(total),
    }));

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
