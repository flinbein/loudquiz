import { useGameStore } from "@/store/gameStore";
import { getRandomEmoji } from "@/logic/emojiPool";
import { createNextBlitzRoundState, createNextRoundState } from "@/logic/phaseTransitions";
import {
  createTimer,
  getBlitzCaptainTimerDuration,
  getCaptainTimerDuration,
  getTopicsSuggestTimerDuration,
} from "@/logic/timer";
import type { GameState, TeamId } from "@/types/game";

export function handleJoin(_peerId: string, name: string): void {
  const state = useGameStore.getState();
  const existing = state.players.find((p) => p.name === name);

  if (existing) {
    const players = state.players.map((p) =>
      p.name === name ? { ...p, online: true } : p,
    );
    useGameStore.getState().setState({ players });
    return;
  }

  const occupied = state.players.map((p) => p.emoji);
  const emoji = getRandomEmoji(occupied);
  const team = "none";

  const player = { name, emoji, team, online: true, ready: false } as const;
  useGameStore.getState().setState({
    players: [...state.players, player],
  });
}

export function handleSetTeam(name: string, teamId: TeamId): void {
  const state = useGameStore.getState();
  if (state.phase !== "lobby") return;
  const players = state.players.map((p) =>
    p.name === name && !p.ready ? { ...p, team: teamId } : p,
  );
  useGameStore.getState().setState({ players });
}

export function handleSetReady(name: string, ready: boolean): void {
  const state = useGameStore.getState();
  if (state.phase !== "lobby") return;
  const players = state.players.map((p) =>
    p.name === name ? { ...p, ready } : p,
  );
  useGameStore.getState().setState({ players });
}

export function handleChangeEmoji(name: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "lobby") return;
  const player = state.players.find((p) => p.name === name);
  if (!player || player.ready) return;

  const occupied = state.players.map((p) => p.emoji);
  const newEmoji = getRandomEmoji(occupied);
  const players = state.players.map((p) =>
    p.name === name ? { ...p, emoji: newEmoji } : p,
  );
  useGameStore.getState().setState({ players });
}

export function kickPlayer(name: string): void {
  const state = useGameStore.getState();
  const players = state.players.filter((p) => p.name !== name);
  useGameStore.getState().setState({ players });
}

export function movePlayer(name: string, teamId: TeamId): void {
  const state = useGameStore.getState();
  const players = state.players.map((p) =>
    p.name === name ? { ...p, team: teamId } : p,
  );
  useGameStore.getState().setState({ players });
}

export function canStartGame(): boolean {
  const state = useGameStore.getState();
  if (state.players.length === 0) return false;
  if (!state.players.every((p) => p.ready && p.online)) return false;

  const teamSizes: number[] = [];
  for (const team of state.teams) {
    const count = state.players.filter((p) => p.team === team.id).length;
    if (count < 2) return false;
    teamSizes.push(count);
  }
  if (teamSizes.length > 1 && !teamSizes.every((s) => s === teamSizes[0]))
    return false;

  if (state.settings.teamMode === "dual") {
    if (state.players.some((p) => !p.team)) return false;
  }

  return true;
}

export function startGame(startingTeam?: TeamId): void {
  if (!canStartGame()) return;
  const state = useGameStore.getState();
  const nextPhase: GameState["phase"] =
    state.settings.mode === "ai" ? "topics-collecting" : "round-captain";

  let teamId: TeamId;
  if (startingTeam && state.teams.some((t) => t.id === startingTeam)) {
    teamId = startingTeam;
  } else if (state.teams.length > 0) {
    teamId = state.teams[Math.floor(Math.random() * state.teams.length)]!.id;
  } else {
    teamId = "none";
  }

  let extra: Partial<GameState> = {};
  if (nextPhase === "round-captain") {
    extra = {
      currentRound: createNextRoundState(teamId),
      timer: createTimer(getCaptainTimerDuration()),
    };
  } else {
    // topics-collecting
    const timer = createTimer(getTopicsSuggestTimerDuration());
    extra = {
      topicsSuggest: {
        suggestions: {},
        noIdeas: [],
        timerEndsAt: timer.startedAt + timer.duration,
        manualTopics: null,
        generationStep: null,
        aiError: null,
      },
      timer,
    };
  }

  useGameStore.getState().setState({ phase: nextPhase, ...extra });
}

export function canStartGameAsHost(): boolean {
  const state = useGameStore.getState();
  if (state.players.length === 0) return false;

  if (state.settings.teamMode === "dual") {
    const teamSizes: number[] = [];
    for (const team of state.teams) {
      const count = state.players.filter((p) => p.team === team.id).length;
      teamSizes.push(count);
    }
    if (teamSizes.some((s) => s < 2)) return false;
    if (!teamSizes.every((s) => s === teamSizes[0])) return false;
  } else {
    if (state.players.length < 2) return false;
  }

  return true;
}

export function playAgain(): void {
  const state = useGameStore.getState();
  if (state.phase !== "finale") return;
  if (state.settings.mode !== "ai") return;

  const timer = createTimer(getTopicsSuggestTimerDuration());

  useGameStore.getState().setState({
    phase: "topics-collecting",
    players: state.players.map((p) => ({ ...p, ready: false })),
    teams: state.teams.map((t) => ({ ...t, score: 0, jokerUsed: false })),
    topics: [],
    blitzTasks: [],
    history: [],
    currentRound: null,
    topicsSuggest: {
      suggestions: {},
      noIdeas: [],
      timerEndsAt: timer.startedAt + timer.duration,
      manualTopics: null,
      generationStep: null,
      aiError: null,
    },
    timer,
  });
}

export function startGameAsHost(): void {
  if (!canStartGameAsHost()) return;
  const state = useGameStore.getState();

  let players = state.players;

  if (state.settings.teamMode === "dual") {
    players = players.filter((p) => !!p.team);
  }

  players = players.map((p) => ({ ...p, ready: true }));

  const nextPhase  = ((): GameState["phase"] => {
    if (state.settings.mode === "ai") return "topics-collecting";
    const questionsCount = state.topics.reduce((a, t) => a + t.questions.length, 0);
    if (state.settings.teamMode === "dual" && questionsCount >= 2) return "round-captain";
    if (state.settings.teamMode === "single" && questionsCount >= 1) return "round-captain";
    return "blitz-captain";
  })();
  
  const teamId = state.teams[Math.round(Math.random() * state.teams.length)]?.id ?? "none";
  let extra: Partial<GameState> = {};
  if (nextPhase === "round-captain") {
    extra = {
      currentRound: createNextRoundState(teamId),
      timer: createTimer(getCaptainTimerDuration()),
    };
  } else if (nextPhase === "blitz-captain") {
    extra = {
      currentRound: createNextBlitzRoundState(teamId, 0),
      timer: createTimer(getBlitzCaptainTimerDuration()),
    };
  } else {
    // topics-collecting
    const timer = createTimer(getTopicsSuggestTimerDuration());
    extra = {
      topicsSuggest: {
        suggestions: {},
        noIdeas: [],
        timerEndsAt: timer.startedAt + timer.duration,
        manualTopics: null,
        generationStep: null,
        aiError: null,
      },
      timer,
    };
  }

  useGameStore.getState().setState({ players, phase: nextPhase, ...extra });
}
