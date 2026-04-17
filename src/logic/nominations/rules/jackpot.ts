import type { NominationRule } from "../types";

export const jackpotRule: NominationRule = {
  id: "jackpot",
  emoji: "💎",
  titleKey: "finale.nomination.jackpot.title",
  descriptionKey: "finale.nomination.jackpot.description",
  tieStrategy: "all",
  compute(ctx) {
    if (ctx.history.length === 0) return null;

    const maxScore = Math.max(...ctx.history.map((r) => r.score));

    const seen = new Set<string>();
    const candidates = ctx.history
      .filter((r) => r.score === maxScore && r.captainName)
      .flatMap((r) => {
        if (seen.has(r.captainName)) return [];
        seen.add(r.captainName);
        return [
          {
            playerName: r.captainName,
            value: maxScore,
            statLabel: String(maxScore),
          },
        ];
      });

    if (candidates.length === 0) return null;
    return candidates;
  },
};
