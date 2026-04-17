import type { NominationRule } from "../types";

export const artistRule: NominationRule = {
  id: "artist",
  emoji: "🎨",
  titleKey: "finale.nomination.artist.title",
  descriptionKey: "finale.nomination.artist.description",
  tieStrategy: "skip",
  compute(ctx) {
    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        const matches = pr.answerText.match(/\p{Emoji_Presentation}/gu);
        const count = matches ? matches.length : 0;
        if (count > 0) {
          counts.set(pr.playerName, (counts.get(pr.playerName) ?? 0) + count);
        } else if (!counts.has(pr.playerName)) {
          counts.set(pr.playerName, 0);
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
