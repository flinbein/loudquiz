import type { NominationRule } from "../types";

export const eruditeRule: NominationRule = {
  id: "erudite",
  emoji: "🎓",
  titleKey: "finale.nomination.erudite.title",
  descriptionKey: "finale.nomination.erudite.description",
  tieStrategy: "skip",
  compute(ctx) {
    const playerTopics = new Map<string, Set<number>>();

    for (const round of ctx.history) {
      if (round.topicIndex === -1) continue; // skip blitz
      for (const pr of round.playerResults) {
        if (pr.correct !== true) continue;
        const topics = playerTopics.get(pr.playerName) ?? new Set<number>();
        topics.add(round.topicIndex);
        playerTopics.set(pr.playerName, topics);
      }
    }

    if (playerTopics.size === 0) return null;

    const candidates = Array.from(playerTopics.entries())
      .map(([playerName, topics]) => ({
        playerName,
        value: topics.size,
        statLabel: String(topics.size),
      }));

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
