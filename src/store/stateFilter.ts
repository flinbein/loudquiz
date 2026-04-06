import type { GameState } from "@/types/game";

/**
 * Filter game state for a specific player before sending via transport.
 *
 * Rules:
 * - Question text in round-active/round-answer: visible to captain only.
 *   In dual mode, also visible to opponent team members.
 * - Blitz task items in blitz-pick: visible to captain only.
 * - Other players' answers: hidden until round-review/blitz-review.
 */
export function filterStateForPlayer(
  state: GameState,
  playerName: string,
): GameState {
  const round = state.currentRound;
  if (!round) return state;

  const player = state.players.find((p) => p.name === playerName);
  if (!player) return state;

  const isCaptain = round.captainName === playerName;
  const isInActiveTeam = player.team === round.teamId;
  const isOpponent = !isInActiveTeam;
  const isDual = state.settings.teamMode === "dual";

  let filtered = state;

  // Hide question text during active/answer phases
  if (
    round.type === "round" &&
    (state.phase === "round-active" || state.phase === "round-answer")
  ) {
    const canSeeQuestion = isCaptain || (isDual && isOpponent);
    if (!canSeeQuestion && round.questionIndex != null) {
      filtered = hideQuestionText(filtered, round.questionIndex);
    }
  }

  // Hide blitz task items during blitz-pick (captain only sees them)
  if (state.phase === "blitz-pick" && !isCaptain) {
    filtered = hideBlitzTaskItems(filtered);
  }

  // Hide other players' answers before review phase
  if (
    state.phase !== "round-review" &&
    state.phase !== "blitz-review"
  ) {
    filtered = hideOtherAnswers(filtered, playerName);
  }

  return filtered;
}

function hideQuestionText(state: GameState, questionIndex: number): GameState {
  const topics = state.topics.map((topic) => ({
    ...topic,
    questions: topic.questions.map((q, i) =>
      i === questionIndex ? { ...q, text: "" } : q,
    ),
  }));
  return { ...state, topics };
}

function hideBlitzTaskItems(state: GameState): GameState {
  const blitzTasks = state.blitzTasks.map((task) => ({
    ...task,
    items: task.items.map((item) => ({ ...item, text: "" })),
  }));
  return { ...state, blitzTasks };
}

function hideOtherAnswers(
  state: GameState,
  playerName: string,
): GameState {
  if (!state.currentRound) return state;

  const filteredAnswers: Record<string, { text: string; timestamp: number }> =
    {};
  for (const [name, answer] of Object.entries(state.currentRound.answers)) {
    if (name === playerName) {
      filteredAnswers[name] = answer;
    } else {
      filteredAnswers[name] = { text: "", timestamp: 0 };
    }
  }

  return {
    ...state,
    currentRound: {
      ...state.currentRound,
      answers: filteredAnswers,
    },
  };
}
