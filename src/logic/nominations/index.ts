import type { PlayerData, PlayerDisplay, RoundResult, Topic } from "@/types/game";
import type { Nomination, NominationCandidate, NominationContext, NominationRule } from "./types";

export { type Nomination, type NominationRule, type NominationContext } from "./types";

export function computeNominations(
  history: RoundResult[],
  players: PlayerData[],
  topics: Topic[],
  rules: NominationRule[],
): Nomination[] {
  const ctx: NominationContext = { history, players, topics };
  const results: Nomination[] = [];

  for (const rule of rules) {
    const candidates = rule.compute(ctx);
    if (!candidates || candidates.length === 0) continue;

    const maxValue = candidates[0]!.value;
    const leaders = candidates.filter((c) => c.value === maxValue);

    let selectedCandidates: NominationCandidate[];
    if (leaders.length > 1) {
      if (rule.tieStrategy === "skip") continue;
      if (rule.tieStrategy === "random") {
        const pick = leaders[Math.floor(Math.random() * leaders.length)]!;
        selectedCandidates = [pick];
      } else {
        selectedCandidates = leaders;
      }
    } else {
      selectedCandidates = leaders;
    }

    results.push({
      id: rule.id,
      emoji: rule.emoji,
      titleKey: rule.titleKey,
      descriptionKey: rule.descriptionKey,
      winners: resolveWinners(selectedCandidates, players),
      stat: selectedCandidates[0]!.statLabel,
    });
  }

  return results;
}

function resolveWinners(
  candidates: NominationCandidate[],
  players: PlayerData[],
): PlayerDisplay[] {
  return candidates.map((c) => {
    const player = players.find((p) => p.name === c.playerName);
    return {
      emoji: player?.emoji ?? "",
      name: c.playerName,
      team: player?.team ?? "none",
    };
  });
}
