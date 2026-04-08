import { useGameStore } from "@/store/gameStore";
import { canBeCaptain, getRandomCaptain } from "@/logic/captain";
import { getPlayedQuestionIndices, getNextPhaseAfterReview, createNextRoundState, getTotalQuestionCount } from "@/logic/phaseTransitions";
import { createTimer, getPickTimerDuration, getCaptainTimerDuration, getActiveTimerDuration, getAnswerTimerDuration } from "@/logic/timer";
import { calculateRoundScore, calculateBonusMultiplier, checkBonusConditions } from "@/logic/scoring";
import type { AnswerEvaluation, RoundPhase } from "@/types/game";

export function claimCaptain(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-captain") return;
  if (!state.currentRound) return;

  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== state.currentRound.teamId) return;
  if (!canBeCaptain(playerName, state.history)) return;

  useGameStore.getState().setState({
    phase: "round-pick",
    currentRound: { ...state.currentRound, captainName: playerName },
    timer: createTimer(getPickTimerDuration()),
  });
}

export function selectQuestion(linearIndex: number): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-pick" || !state.currentRound) return;

  const played = getPlayedQuestionIndices(state.history);
  if (played.includes(linearIndex)) return;

  useGameStore.getState().setState({
    phase: "round-ready",
    currentRound: { ...state.currentRound, questionIndex: linearIndex },
    timer: null,
    players: state.players.map((p) => ({ ...p, ready: false })),
  });
}

export function activateJoker(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-pick" || !state.currentRound) return;

  const team = state.teams.find((t) => t.id === state.currentRound!.teamId);
  if (!team || team.jokerUsed) return;

  useGameStore.getState().setState({
    currentRound: { ...state.currentRound, jokerActive: true },
  });
}

export function setPlayerReady(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-ready" || !state.currentRound) return;

  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== state.currentRound.teamId) return;

  const players = state.players.map((p) =>
    p.name === playerName ? { ...p, ready: true } : p,
  );

  const teamPlayers = players.filter((p) => p.team === state.currentRound!.teamId);
  const allReady = teamPlayers.every((p) => p.ready);

  if (allReady) {
    const respondersCount = teamPlayers.length - 1;
    const activeTimer = createTimer(getActiveTimerDuration(respondersCount));
    useGameStore.getState().setState({
      phase: "round-active",
      players,
      timer: activeTimer,
      currentRound: { ...state.currentRound, activeTimerStartedAt: activeTimer.startedAt },
    });
  } else {
    useGameStore.getState().setState({ players });
  }
}

export function submitAnswer(playerName: string, text: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-active" && state.phase !== "round-answer") return;
  if (!state.currentRound) return;
  if (state.currentRound.captainName === playerName) return;
  if (state.currentRound.answers[playerName]) return;

  const newAnswers = {
    ...state.currentRound.answers,
    [playerName]: { text, timestamp: Date.now() },
  };

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      answers: newAnswers,
    },
  });

  // Auto-transition to review when all responders have answered
  const teamPlayers = state.players.filter((p) => p.team === state.currentRound!.teamId);
  const respondersCount = teamPlayers.length - 1;
  if (Object.keys(newAnswers).length >= respondersCount) {
    useGameStore.getState().setState({
      phase: "round-review",
      timer: null,
    });
    initReview();
  }
}

export function handleTimerExpire(phase: RoundPhase): void {
  const state = useGameStore.getState();
  if (state.phase !== phase || !state.currentRound) return;

  switch (phase) {
    case "round-captain": {
      const teamPlayers = state.players.filter((p) => p.team === state.currentRound!.teamId);
      const captain = getRandomCaptain(teamPlayers, state.history);
      useGameStore.getState().setState({
        phase: "round-pick",
        currentRound: { ...state.currentRound, captainName: captain },
        timer: createTimer(getPickTimerDuration()),
      });
      break;
    }
    case "round-pick": {
      const played = getPlayedQuestionIndices(state.history);
      const total = getTotalQuestionCount(state.topics);
      let autoIndex = 0;
      for (let i = 0; i < total; i++) {
        if (!played.includes(i)) { autoIndex = i; break; }
      }
      selectQuestion(autoIndex);
      break;
    }
    case "round-active": {
      useGameStore.getState().setState({
        phase: "round-answer",
        timer: createTimer(getAnswerTimerDuration()),
      });
      break;
    }
    case "round-answer": {
      useGameStore.getState().setState({
        phase: "round-review",
        timer: null,
      });
      initReview();
      break;
    }
  }
}

export function initReview(): void {
  const state = useGameStore.getState();
  if (!state.currentRound) return;

  const evaluations: AnswerEvaluation[] = Object.entries(state.currentRound.answers).map(
    ([playerName, answer]) => ({
      playerName,
      correct: answer.text === "" ? false : null,
    }),
  );

  const groups = Object.keys(state.currentRound.answers).map((name) => [name]);

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: {
        evaluations,
        groups,
        score: 0,
        bonusMultiplier: 0,
        scoreConfirmed: false,
        jokerApplied: state.currentRound.jokerActive,
      },
    },
  });
}

export function evaluateGroup(groupPlayers: string[], correct: boolean | null): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const evaluations = state.currentRound.reviewResult.evaluations.map((e) =>
    groupPlayers.includes(e.playerName) ? { ...e, correct } : e,
  );

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: { ...state.currentRound.reviewResult, evaluations },
    },
  });
}

export function evaluateAnswer(playerName: string, correct: boolean): void {
  evaluateGroup([playerName], correct);
}

export function confirmScore(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const review = state.currentRound.reviewResult;
  const round = state.currentRound;

  // Count correct groups (stacks), not individual evaluations
  const correctCount = review.groups.filter((group) => {
    const eval_ = review.evaluations.find((e) => e.playerName === group[0]);
    return eval_?.correct === true;
  }).length;

  let difficulty = 100;
  if (round.questionIndex != null) {
    let remaining = round.questionIndex;
    for (const topic of state.topics) {
      if (remaining < topic.questions.length) {
        difficulty = topic.questions[remaining].difficulty;
        break;
      }
      remaining -= topic.questions.length;
    }
  }

  const teamPlayers = state.players.filter((p) => p.team === round.teamId);
  const respondersCount = teamPlayers.length - 1;
  const activeDuration = getActiveTimerDuration(respondersCount);

  const bonus = checkBonusConditions(
    round.answers,
    review.evaluations,
    review.groups,
    respondersCount,
    activeDuration,
    round.activeTimerStartedAt,
  );
  const bonusMultiplier = bonus.hasBonus
    ? calculateBonusMultiplier(bonus.bonusTime, activeDuration)
    : 0;

  const score = calculateRoundScore(difficulty, correctCount, round.jokerActive, bonusMultiplier);

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: { ...review, score, bonusMultiplier, scoreConfirmed: true },
    },
  });
}

export function mergeAnswerGroups(sourcePlayer: string, targetPlayer: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const review = state.currentRound.reviewResult;
  const sourceGroupIdx = review.groups.findIndex((g) => g.includes(sourcePlayer));
  const targetGroupIdx = review.groups.findIndex((g) => g.includes(targetPlayer));
  if (sourceGroupIdx === -1 || targetGroupIdx === -1 || sourceGroupIdx === targetGroupIdx) return;

  const merged = [...review.groups[sourceGroupIdx], ...review.groups[targetGroupIdx]];
  const groups = review.groups.filter((_, i) => i !== sourceGroupIdx && i !== targetGroupIdx);
  groups.push(merged);

  const evaluations = review.evaluations.map((e) =>
    merged.includes(e.playerName) ? { ...e, correct: true as boolean | null } : e,
  );

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: { ...review, groups, evaluations },
    },
  });
}

export function splitAnswerFromGroup(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const review = state.currentRound.reviewResult;
  const groupIdx = review.groups.findIndex((g) => g.includes(playerName));
  if (groupIdx === -1 || review.groups[groupIdx].length <= 1) return;

  const groups = review.groups.map((g, i) =>
    i === groupIdx ? g.filter((n) => n !== playerName) : g,
  );
  groups.push([playerName]);

  const evaluations = review.evaluations.map((e) =>
    e.playerName === playerName ? { ...e, correct: null as boolean | null } : e,
  );

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: { ...review, groups, evaluations },
    },
  });
}

export function confirmReview(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const review = state.currentRound.reviewResult;
  const round = state.currentRound;
  const score = review.score;

  const result = {
    type: "round" as const,
    teamId: round.teamId,
    captainName: round.captainName,
    questionIndex: round.questionIndex,
    score,
    jokerUsed: round.jokerActive,
  };

  const teams = state.teams.map((t) => {
    if (t.id !== round.teamId) return t;
    return {
      ...t,
      score: t.score + score,
      jokerUsed: round.jokerActive ? true : t.jokerUsed,
    };
  });

  const history = [...state.history, result];
  const totalQuestions = getTotalQuestionCount(state.topics);
  const nextPhase = getNextPhaseAfterReview(totalQuestions, history, state.blitzTasks.length);

  const nextRound = nextPhase === "round-captain"
    ? createNextRoundState(round.teamId)
    : null;

  useGameStore.getState().setState({
    phase: nextPhase,
    currentRound: nextRound,
    history,
    teams,
    timer: nextPhase === "round-captain" ? createTimer(getCaptainTimerDuration()) : null,
    players: state.players.map((p) => ({ ...p, ready: false })),
  });
}

export function disputeReview(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const evaluations = state.currentRound.reviewResult.evaluations.map((e) => ({
    ...e,
    correct: (state.currentRound!.answers[e.playerName]?.text === "" ? false : null) as boolean | null,
  }));

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: {
        ...state.currentRound.reviewResult,
        score: 0,
        scoreConfirmed: false,
        evaluations,
      },
    },
  });
}
