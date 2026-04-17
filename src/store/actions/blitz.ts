import { useGameStore } from "@/store/gameStore";
import { canBeCaptain, getRandomCaptain } from "@/logic/captain";
import {
  createTimer,
  getBlitzActiveTimerDuration,
  getBlitzAnswerTimerDuration,
  getBlitzPickTimerDuration,
} from "@/logic/timer";
import { checkBlitzAnswer } from "@/logic/blitzCheck";
import {
  calculateBlitzScore,
  calculateBonusMultiplier,
} from "@/logic/scoring";
import type {
  AnswerEvaluation,
  BlitzPhase,
  PlayerRoundResult,
  ReviewResult,
  RoundResult,
} from "@/types/game";
import { goToNextRound } from "@/store/actions/round";

/**
 * Blitz actions mirror round actions but encode the relay-chain rules from
 * spec/game/blitz.md. Only host-side game logic lives here — UI-local state
 * (inputs, mid-chain hints) stays in components.
 */

// ---------- blitz-captain ----------

export function claimBlitzCaptain(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "blitz-captain") return;
  const round = state.currentRound;
  if (!round || round.type !== "blitz") return;
  if (round.captainName) return;

  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== round.teamId) return;
  if (!canBeCaptain(playerName, state.history)) return;

  useGameStore.getState().setState({
    currentRound: {
      ...round,
      captainName: playerName,
      playerOrder: [playerName],
    },
  });
}

/**
 * Blitz chain slot reservation. Slots fill in order; `slotIndex` is 1-based
 * (slot 1 = first responder after the captain).
 */
export function claimBlitzSlot(playerName: string, slotIndex: number): void {
  const state = useGameStore.getState();
  if (state.phase !== "blitz-captain") return;
  const round = state.currentRound;
  if (!round || round.type !== "blitz" || !round.captainName) return;

  const order = round.playerOrder ?? [round.captainName];
  if (order.includes(playerName)) return;
  if (slotIndex < 1) return;

  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== round.teamId) return;

  // Compact order: captain + slot 1, 2, ...; next slot is length - 1 + 1.
  const nextSlot = order.length; // next available slot (1-based in the chain)
  if (slotIndex !== nextSlot) return;

  const newOrder = [...order, playerName];

  // If every responder has picked a slot, advance to blitz-pick.
  const teamPlayers = state.players.filter((p) => p.team === round.teamId);
  const allPicked = newOrder.length === teamPlayers.length;

  useGameStore.getState().setState({
    currentRound: { ...round, playerOrder: newOrder },
    ...(allPicked
      ? { phase: "blitz-pick", timer: createTimer(getBlitzPickTimerDuration()) }
      : {}),
  });
}

// ---------- blitz-pick ----------

/**
 * Captain picks an item (word) from the current blitz task. The task itself
 * is pre-assigned when the blitz round is created (`createNextBlitzRoundState`),
 * so here we only record the item index chosen among that task's items.
 */
export function selectBlitzItem(itemIndex: number): void {
  const state = useGameStore.getState();
  if (state.phase !== "blitz-pick") return;
  const round = state.currentRound;
  if (!round || round.type !== "blitz" || round?.blitzTaskIndex == null) return;

  const task = state.blitzTasks[round.blitzTaskIndex];
  if (!task) return;
  if (itemIndex < 0 || itemIndex >= task.items.length) return;

  useGameStore.getState().setState({
    phase: "blitz-ready",
    currentRound: { ...round, blitzItemIndex: itemIndex },
    timer: null,
    players: state.players.map((p) =>
      p.team === round.teamId ? { ...p, ready: false } : p,
    ),
  });
}

// ---------- blitz-ready ----------

export function setBlitzPlayerReady(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "blitz-ready") return;
  const round = state.currentRound;
  if (!round || round.type !== "blitz") return;

  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== round.teamId) return;

  const players = state.players.map((p) =>
    p.name === playerName ? { ...p, ready: true } : p,
  );
  const teamPlayers = players.filter((p) => p.team === round.teamId);
  const allReady = teamPlayers.every((p) => p.ready);

  if (allReady) {
    startBlitzTask();
  } else {
    useGameStore.getState().setState({ players });
  }
}

export function startBlitzTask(){
  const state = useGameStore.getState();
  if (state.phase !== "blitz-ready" || !state.currentRound) return;
  
  const players = state.players.map((p) =>
    (p.team === state.currentRound?.teamId && !p.ready) ? { ...p, ready: true } : p,
  );
  const teamPlayers = players.filter((p) => p.team === state.currentRound?.teamId);
  const respondersCount = teamPlayers.length - 1;
  const activeTimer = createTimer(getBlitzActiveTimerDuration(respondersCount));
  
  useGameStore.getState().setState({
    phase: "blitz-active",
    players: state.players.map((p) =>
      (p.team === state.currentRound?.teamId && !p.ready) ? { ...p, ready: true } : p,
    ),
    timer: activeTimer,
    currentRound: { ...state.currentRound, activeTimerStartedAt: activeTimer.startedAt },
  });
}

// ---------- blitz-active / blitz-answer ----------

/**
 * Record a blitz answer. In `blitz-active`, only the last player in the chain
 * may submit. In `blitz-answer`, the next-eligible player (from the end of
 * the chain toward the captain) submits; `skipBlitzAnswer` is the "я не знаю"
 * branch.
 */
export function submitBlitzAnswer(playerName: string, text: string): void {
  const state = useGameStore.getState();
  const round = state.currentRound;
  if (!round || round.type !== "blitz") return;
  if (state.phase !== "blitz-active" && state.phase !== "blitz-answer") return;
  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== round.teamId) return;
  const order = round.playerOrder ?? [];
  if (order.length === 0) return;

  if (state.phase === "blitz-active") {
    const lastPlayer = order[order.length - 1];
    if (playerName !== lastPlayer) return;
  } else {
    // blitz-answer: who is "up" right now?
    const up = getNextBlitzAnswerer(order, round.answers);
    if (!up || up !== playerName) return;
  }
  if (round.answers[playerName]) return;

  const newAnswers = {
    ...round.answers,
    [playerName]: { text, timestamp: performance.now() },
  };
  useGameStore.getState().setState({
    currentRound: { ...round, answers: newAnswers },
  });

  // Any submitted (non-empty) answer ends the round → blitz-review.
  if (text !== "") {
    enterBlitzReview();
  }
}

/**
 * "Я не знаю" in blitz-answer. Records an empty answer for the current
 * player and advances the queue. If the queue empties without a real answer,
 * transitions to blitz-review with no answer.
 */
export function skipBlitzAnswer(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "blitz-answer") return;
  const round = state.currentRound;
  if (!round || round.type !== "blitz") return;
  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== round.teamId) return;
  const order = round.playerOrder ?? [];
  const up = getNextBlitzAnswerer(order, round.answers);
  if (!up || up !== playerName) return;

  const newAnswers = {
    ...round.answers,
    [playerName]: { text: "", timestamp: performance.now() },
  };
  useGameStore.getState().setState({
    currentRound: { ...round, answers: newAnswers },
  });

  // If every responder has been asked, go to review with no answer.
  const nextUp = getNextBlitzAnswerer(order, newAnswers);
  if (!nextUp) enterBlitzReview();
}

/**
 * The next player to answer in `blitz-answer`, scanning the chain from the
 * last responder back toward (but excluding) the captain. Returns undefined
 * when everyone has been asked.
 */
export function getNextBlitzAnswerer(
  order: string[],
  answers: Record<string, { text: string; timestamp: number }>,
): string | undefined {
  for (let i = order.length - 1; i >= 1; i--) {
    const name = order[i];
    if (!name || !answers[name]) return name;
  }
  return undefined;
}

// ---------- blitz-review ----------

function enterBlitzReview(): void {
  const state = useGameStore.getState();
  const round = state.currentRound;
  if (!round || round.type !== "blitz") return;
  if (round.blitzTaskIndex == null || round.blitzItemIndex == null) return;

  const task = state.blitzTasks[round.blitzTaskIndex];
  const item = task?.items[round.blitzItemIndex];
  if (!task || !item) return;

  const order = round.playerOrder ?? [];
  const respondersCount = order.length > 0 ? order.length - 1 : 0;
  const activeDuration = getBlitzActiveTimerDuration(respondersCount);

  // Find the answering player — the first non-empty answer in chain order.
  let answererName: string | undefined;
  for (let i = 1; i < order.length; i++) {
    const name = order[i];
    const ans = name ? round.answers[name] : undefined;
    if (ans && ans.text !== "") {
      answererName = name;
      break;
    }
  }

  let score = 0;
  let bonusTime = 0;
  let bonusTimeApplied = false;
  let correct = false;
  const evaluations: AnswerEvaluation[] = [];

  if (answererName) {
    const answer = round.answers[answererName];
    const playerNumber = order.indexOf(answererName); // captain=0, 1,2,...
    correct = checkBlitzAnswer(answer?.text ?? "", [item.text]);

    // Bonus only if answered during blitz-active (before timer expiry).
    const activeEndAt = round.activeTimerStartedAt + activeDuration;
    const answeredInActive = (answer?.timestamp ?? 0) <= activeEndAt;
    if (correct && answeredInActive) {
      bonusTime = Math.max(0, activeEndAt - (answer?.timestamp ?? 0));
      bonusTimeApplied = bonusTime > 0;
    }
    score = calculateBlitzScore(
      item.difficulty,
      playerNumber,
      correct,
      bonusTimeApplied ? bonusTime : 0,
      activeDuration,
    );
    evaluations.push({ playerName: answererName, correct });
  }

  const reviewResult: ReviewResult = {
    evaluations,
    groups: evaluations.map((e) => [e.playerName]),
    score,
    bonusTime,
    bonusTimeMultiplier: calculateBonusMultiplier(
      bonusTimeApplied ? bonusTime : 0,
      activeDuration,
    ),
    bonusTimeApplied,
    jokerApplied: false,
    aiStatus: "idle",
  };

  useGameStore.getState().setState({
    phase: "blitz-review",
    timer: null,
    currentRound: { ...round, reviewResult, bonusTime },
  });
}

export function confirmBlitzReview(): void {
  const state = useGameStore.getState();
  if (state.phase !== "blitz-review") return;
  const round = state.currentRound;
  if (!round || round.type !== "blitz" || !round.reviewResult) return;

  const review = round.reviewResult;
  const task = round.blitzTaskIndex != null ? state.blitzTasks[round.blitzTaskIndex] : undefined;
  const item = task && round.blitzItemIndex != null ? task.items[round.blitzItemIndex] : undefined;

  const playerResults: PlayerRoundResult[] = review.evaluations.map((ev) => {
    const answer = round.answers[ev.playerName];
    return {
      playerName: ev.playerName,
      answerText: answer?.text ?? "",
      correct: ev.correct,
      answerTime: answer ? answer.timestamp - round.activeTimerStartedAt : Infinity,
      groupIndex: review.groups.findIndex((g) => g.includes(ev.playerName)),
    };
  });

  const result: RoundResult = {
    type: "blitz",
    teamId: round.teamId,
    captainName: round.captainName,
    blitzTaskIndex: round.blitzTaskIndex,
    score: review.score,
    jokerUsed: false,
    playerResults,
    difficulty: item?.difficulty ?? 0,
    topicIndex: -1,
    bonusTimeApplied: review.bonusTimeApplied,
    bonusTime: review.bonusTime,
    bonusTimeMultiplier: review.bonusTimeMultiplier,
    groups: review.groups,
  };

  const teams = state.teams.map((teamData) =>
    teamData.id === round.teamId
      ? { ...teamData, score: teamData.score + round.reviewResult!.score }
      : teamData,
  );

  const history = [...state.history, result];
  
  useGameStore.getState().setState({
    history,
    teams,
    players: state.players.map((p) => ({ ...p, ready: false })),
  });
  
  goToNextRound();
}

// ---------- timer expiration ----------

export function handleBlitzTimerExpire(phase: BlitzPhase): void {
  const state = useGameStore.getState();
  if (state.phase !== phase) return;
  const round = state.currentRound;
  if (!round || round.type !== "blitz") return;

  switch (phase) {
    case "blitz-captain": {
      forceBlitzCaptainAndOrder();
      break;
    }
    case "blitz-pick": {
      autoPickBlitzTask();
      break;
    }
    case "blitz-active": {
      // Fall through to blitz-answer for reverse-chain fallback.
      const order = round.playerOrder ?? [];
      const respondersCount = order.length > 0 ? order.length - 1 : 0;
      useGameStore.getState().setState({
        phase: "blitz-answer",
        timer: createTimer(getBlitzAnswerTimerDuration(respondersCount)),
      });
      break;
    }
    case "blitz-answer": {
      enterBlitzReview();
      break;
    }
  }
}

function forceBlitzCaptainAndOrder(): void {
  const state = useGameStore.getState();
  const round = state.currentRound;
  if (!round || round.type !== "blitz") return;

  const teamPlayers = state.players.filter((p) => p.team === round.teamId);
  if (teamPlayers.length === 0) return;

  // Captain: respect "not captain twice in a row" like regular rounds.
  const captain = round.captainName
    ? round.captainName
    : getRandomCaptain(teamPlayers, state.history);

  // Everyone else is shuffled into the chain.
  const others = teamPlayers.filter((p) => p.name !== captain);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [others[i], others[j]] = [others[j]!, others[i]!];
  }
  const playerOrder = [captain, ...others.map((p) => p.name)];

  useGameStore.getState().setState({
    phase: "blitz-pick",
    currentRound: { ...round, captainName: captain, playerOrder },
    timer: createTimer(getBlitzPickTimerDuration()),
  });
}

function autoPickBlitzTask(): void {
  const state = useGameStore.getState();
  const round = state.currentRound;
  if (!round || round.type !== "blitz" || !round.blitzTaskIndex) return;

  const task = state.blitzTasks[round.blitzTaskIndex];
  if (!task || task.items.length === 0) return;
  // Pick the first item on timeout; the UI lets the captain pick any other.
  selectBlitzItem(0);
}
