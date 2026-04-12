import type { GamePhase, RoundPhase, RoundState, RoundResult, Topic, TeamId, BlitzTask } from "@/types/game";

const ROUND_PHASE_ORDER: RoundPhase[] = [
  "round-captain",
  "round-pick",
  "round-ready",
  "round-active",
  "round-answer",
  "round-review",
  "round-result",
];

export function getNextRoundPhase(current: RoundPhase): RoundPhase {
  const index = ROUND_PHASE_ORDER.indexOf(current);
  return ROUND_PHASE_ORDER[index + 1];
}

export function getNextPhaseAfterReview(
  totalQuestions: number,
  history: RoundResult[],
  totalBlitz: number,
): GamePhase {
  const playedCount = getPlayedQuestionIndices(history).length;
  if (playedCount < totalQuestions) return "round-captain";
  const playedBlitz = getPlayedBlitzTaskIds(history).length;
  if (playedBlitz < totalBlitz) return "blitz-captain";
  return "finale";
}

export function getPlayedQuestionIndices(history: RoundResult[]): number[] {
  return history
    .filter((r) => r.type === "round" && r.questionIndex != null)
    .map((r) => r.questionIndex!);
}

export function getPlayedBlitzTaskIds(history: RoundResult[]): string[] {
  return history
    .filter((r) => r.type === "blitz" && r.blitzTaskId != null)
    .map((r) => r.blitzTaskId!);
}

export function getUnplayedBlitzTasks(
  blitzTasks: BlitzTask[],
  history: RoundResult[],
): BlitzTask[] {
  const played = new Set(getPlayedBlitzTaskIds(history));
  return blitzTasks.filter((t) => !played.has(t.id));
}

export function getTotalQuestionCount(topics: Topic[]): number {
  return topics.reduce((sum, t) => sum + t.questions.length, 0);
}

export function createNextRoundState(teamId: TeamId): RoundState {
  return {
    type: "round",
    teamId,
    captainName: "",
    jokerActive: false,
    answers: {},
    activeTimerStartedAt: 0,
    bonusTime: 0,
  };
}

export function createNextBlitzRoundState(
  teamId: TeamId,
  blitzTaskId?: string,
): RoundState {
  return {
    type: "blitz",
    teamId,
    captainName: "",
    blitzTaskId,
    jokerActive: false,
    answers: {},
    playerOrder: [],
    activeTimerStartedAt: 0,
    bonusTime: 0,
  };
}
