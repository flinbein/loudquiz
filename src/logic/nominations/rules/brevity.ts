import type { NominationRule } from "../types";

export const brevityRule: NominationRule = {
  id: "brevity",
  emoji: "✂️",
  titleKey: "finale.nomination.brevity.title",
  descriptionKey: "finale.nomination.brevity.description",
  tieStrategy: "random",
  compute(ctx) {
    const playerLengths = new Map<string, number>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        if (pr.correct !== true) continue;
        playerLengths.set(pr.playerName, (playerLengths.get(pr.playerName) ?? 0) + pr.answerText.length);
      }
    }

    if (playerLengths.size === 0) return null;

    const candidates = Array.from(playerLengths.entries()).map(([playerName, totalLength]) => ({
      playerName,
      value: -totalLength,
      statLabel: String(totalLength),
    }));

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
