import type { NominationRule } from "../types";

export const sayMyNameRule: NominationRule = {
  id: "sayMyName",
  emoji: "📢",
  titleKey: "finale.nomination.sayMyName.title",
  descriptionKey: "finale.nomination.sayMyName.description",
  tieStrategy: "skip",
  compute(ctx) {
    const playerNames = ctx.players.map((p) => p.name.toLowerCase());
    if (playerNames.length === 0) return null;

    const counts = new Map<string, number>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        const answerLower = pr.answerText.toLowerCase();
        const mentionCount = playerNames.filter((name) => answerLower.includes(name)).length;
        if (mentionCount > 0) {
          counts.set(pr.playerName, (counts.get(pr.playerName) ?? 0) + mentionCount);
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
