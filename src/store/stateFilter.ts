import type { GameState } from "@/types/game";

export function filterStateForPlayer(
  state: GameState,
  playerName: string,
): GameState {
  if (
    state.topicsSuggest &&
    (state.phase === "topics-collecting" ||
      state.phase === "topics-generating" ||
      state.phase === "topics-preview")
  ) {
    return filterTopicsSuggest(state, playerName);
  }

  const round = state.currentRound;
  if (!round) return state;

  const player = state.players.find((p) => p.name === playerName);
  if (!player) return state;

  let filtered = state;

  if (
    state.phase !== "round-review" &&
    state.phase !== "blitz-review"
  ) {
    filtered = hideOtherAnswers(filtered, playerName);
  }

  if (state.phase === "round-review" && round.reviewResult) {
    const status = round.reviewResult.aiStatus;
    if (status === "idle" || status === "loading") {
      filtered = hideReviewEvaluations(filtered);
    }
  }

  return filtered;
}

function filterTopicsSuggest(
  state: GameState,
  playerName: string,
): GameState {
  if (!state.topicsSuggest) return state;
  const own = state.topicsSuggest.suggestions[playerName] ?? [];
  return {
    ...state,
    topicsSuggest: {
      ...state.topicsSuggest,
      suggestions: { [playerName]: own },
    },
  };
}

function hideReviewEvaluations(state: GameState): GameState {
  if (!state.currentRound?.reviewResult) return state;
  return {
    ...state,
    currentRound: {
      ...state.currentRound,
      reviewResult: {
        ...state.currentRound.reviewResult,
        evaluations: [],
      },
    },
  };
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
