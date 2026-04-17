import type { GamePhase, RoundPhase, RoundState, RoundResult, Topic, TeamId } from "@/types/game";

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
  return ROUND_PHASE_ORDER[index + 1]!;
}

export function getNextPhaseAfterReview(
  totalQuestions: number,
  history: RoundResult[],
  totalBlitz: number,
  teamCount: number = 1,
): GamePhase {
  const playedCount = getPlayedQuestionIndices(history).length;
  const effectiveQuestions = totalQuestions - (totalQuestions % teamCount);
  if (playedCount < effectiveQuestions) return "round-captain";
  const playedBlitz = getPlayedBlitzTaskIds(history).length;
  const effectiveBlitz = totalBlitz - (totalBlitz % teamCount);
  if (playedBlitz < effectiveBlitz) return "blitz-captain";
  return "finale";
}

export function getPlayedQuestionIndices(history: RoundResult[]): number[] {
  return history
    .filter((r) => r.type === "round" && r.questionIndex != null)
    .map((r) => r.questionIndex!);
}

export function getPlayedBlitzTaskIds(history: RoundResult[]): number[] {
  return history
    .filter((r) => r.type === "blitz" && r.blitzTaskIndex != null)
    .map((r) => r.blitzTaskIndex!);
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
  blitzTaskIndex?: number,
): RoundState {
  return {
    type: "blitz",
    teamId,
    captainName: "",
    blitzTaskIndex,
    jokerActive: false,
    answers: {},
    playerOrder: [],
    activeTimerStartedAt: 0,
    bonusTime: 0,
  };
}

export function getTopicIndexForQuestion(
  questionIndex: number,
  topics: Topic[],
): number {
  let remaining = questionIndex;
  for (let i = 0; i < topics.length; i++) {
    if (remaining < topics[i]!.questions.length) return i;
    remaining -= topics[i]!.questions.length;
  }
  return -1;
}

export function getDifficultyForQuestion(
  questionIndex: number,
  topics: Topic[],
): number {
  let remaining = questionIndex;
  for (const topic of topics) {
    if (remaining < topic.questions.length) {
      return topic.questions[remaining]?.difficulty ?? 0;
    }
    remaining -= topic.questions.length;
  }
  return 0;
}
