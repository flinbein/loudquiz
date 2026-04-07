import type { GamePhase, RoundPhase, RoundState, RoundResult, Topic } from "@/types/game";

const ROUND_PHASE_ORDER: RoundPhase[] = [
  "round-captain",
  "round-pick",
  "round-ready",
  "round-active",
  "round-answer",
  "round-review",
];

export function getNextRoundPhase(current: RoundPhase): RoundPhase {
  const index = ROUND_PHASE_ORDER.indexOf(current);
  return ROUND_PHASE_ORDER[index + 1];
}

export function getNextPhaseAfterReview(
  totalQuestions: number,
  history: RoundResult[],
  blitzTaskCount: number,
): GamePhase {
  const playedCount = getPlayedQuestionIndices(history).length;
  if (playedCount < totalQuestions) return "round-captain";
  if (blitzTaskCount > 0) return "blitz-captain";
  return "finale";
}

export function getPlayedQuestionIndices(history: RoundResult[]): number[] {
  return history
    .filter((r) => r.type === "round" && r.questionIndex != null)
    .map((r) => r.questionIndex!);
}

export function getTotalQuestionCount(topics: Topic[]): number {
  return topics.reduce((sum, t) => sum + t.questions.length, 0);
}

export function createNextRoundState(teamId: string): RoundState {
  return {
    type: "round",
    teamId,
    captainName: "",
    jokerActive: false,
    answers: {},
    bonusTime: 0,
  };
}
