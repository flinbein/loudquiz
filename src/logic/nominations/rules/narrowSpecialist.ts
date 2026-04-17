import type { NominationRule } from "../types";

export const narrowSpecialistRule: NominationRule = {
  id: "narrowSpecialist",
  emoji: "🔬",
  titleKey: "finale.nomination.narrowSpecialist.title",
  descriptionKey: "finale.nomination.narrowSpecialist.description",
  tieStrategy: "skip",
  compute(ctx) {
    // Collect all distinct non-blitz topic indices in history
    const allTopics = new Set<number>();
    for (const round of ctx.history) {
      if (round.topicIndex !== -1) allTopics.add(round.topicIndex);
    }

    // Only award if game had 2+ topics overall
    if (allTopics.size < 2) return null;

    // For each player, find correct answers on non-blitz rounds
    const playerData = new Map<string, { topics: Set<number>; difficultySum: number }>();

    for (const round of ctx.history) {
      if (round.topicIndex === -1) continue;
      for (const pr of round.playerResults) {
        if (pr.correct !== true) continue;
        const entry = playerData.get(pr.playerName) ?? { topics: new Set<number>(), difficultySum: 0 };
        entry.topics.add(round.topicIndex);
        entry.difficultySum += round.difficulty;
        playerData.set(pr.playerName, entry);
      }
    }

    if (playerData.size === 0) return null;

    // Keep only players with exactly 1 topic
    const specialists = Array.from(playerData.entries()).filter(([, d]) => d.topics.size === 1);

    if (specialists.length === 0) return null;

    const candidates = specialists.map(([playerName, d]) => ({
      playerName,
      value: d.difficultySum,
      statLabel: String(d.difficultySum),
    }));

    candidates.sort((a, b) => b.value - a.value);
    return candidates;
  },
};
