import type { PlayerData, PlayerDisplay, RoundResult, Topic } from "@/types/game";
import type { Nomination, NominationCandidate, NominationContext, NominationRule } from "./types";
import { sniperRule } from "./rules/sniper";
import { missRule } from "./rules/miss";
import { flawlessRule } from "./rules/flawless";
import { eruditeRule } from "./rules/erudite";
import { quickDrawRule } from "./rules/quickDraw";
import { philosopherRule } from "./rules/philosopher";
import { captainsDaughterRule } from "./rules/captainsDaughter";
import { sinkTheShipRule } from "./rules/sinkTheShip";
import { captainObviousRule } from "./rules/captainObvious";
import { captainFailRule } from "./rules/captainFail";
import { eternalCaptainRule } from "./rules/eternalCaptain";
import { ambitiousRule } from "./rules/ambitious";
import { cautiousRule } from "./rules/cautious";
import { goldMineRule } from "./rules/goldMine";
import { riskyPlayerRule } from "./rules/riskyPlayer";
import { unluckyGamblerRule } from "./rules/unluckyGambler";
import { jackpotRule } from "./rules/jackpot";
import { iDontPlayRule } from "./rules/iDontPlay";
import { longestAnswerRule } from "./rules/longestAnswer";
import { typewriterRule } from "./rules/typewriter";
import { brevityRule } from "./rules/brevity";
import { narrowSpecialistRule } from "./rules/narrowSpecialist";
import { blitzMasterRule } from "./rules/blitzMaster";
import { sayMyNameRule } from "./rules/sayMyName";
import { artistRule } from "./rules/artist";
import { mentalConnectionRule } from "./rules/mentalConnection";
import { stuckRecordRule } from "./rules/stuckRecord";
import { interviewerRule } from "./rules/interviewer";
import { robotRule } from "./rules/robot";
import { spyRule } from "./rules/spy";

export { type Nomination, type NominationRule, type NominationContext } from "./types";

export const NOMINATION_RULES: NominationRule[] = [
  sniperRule,
  missRule,
  flawlessRule,
  eruditeRule,
  quickDrawRule,
  philosopherRule,
  captainsDaughterRule,
  sinkTheShipRule,
  captainObviousRule,
  captainFailRule,
  eternalCaptainRule,
  ambitiousRule,
  cautiousRule,
  goldMineRule,
  riskyPlayerRule,
  unluckyGamblerRule,
  jackpotRule,
  iDontPlayRule,
  longestAnswerRule,
  typewriterRule,
  brevityRule,
  narrowSpecialistRule,
  blitzMasterRule,
  sayMyNameRule,
  artistRule,
  mentalConnectionRule,
  stuckRecordRule,
  interviewerRule,
  robotRule,
  spyRule,
];

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

export function getAllNominations(
  history: RoundResult[],
  players: PlayerData[],
  topics: Topic[],
): Nomination[] {
  return computeNominations(history, players, topics, NOMINATION_RULES);
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
