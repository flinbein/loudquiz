import { useGameStore } from "@/store/gameStore";
import { getRandomEmoji } from "@/logic/emojiPool";
import { createNextRoundState } from "@/logic/phaseTransitions";
import { createTimer, getCaptainTimerDuration } from "@/logic/timer";
import { TeamId } from "@/types/game";

export function handleJoin(peerId: string, name: string): void {
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

export function startGame(): void {
  if (!canStartGame()) return;
  const state = useGameStore.getState();
  const nextPhase =
    state.settings.mode === "ai" ? "topics-suggest" : "round-captain";

  const teamId = state.teams[0]?.id ?? "none";
  const roundInit = nextPhase === "round-captain"
    ? {
        currentRound: createNextRoundState(teamId),
        timer: createTimer(getCaptainTimerDuration()),
      }
    : {};

  useGameStore.getState().setState({ phase: nextPhase, ...roundInit });
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

export function startGameAsHost(): void {
  if (!canStartGameAsHost()) return;
  const state = useGameStore.getState();

  let players = state.players;

  if (state.settings.teamMode === "dual") {
    players = players.filter((p) => !!p.team);
  }

  players = players.map((p) => ({ ...p, ready: true }));

  const nextPhase =
    state.settings.mode === "ai" ? "topics-suggest" : "round-captain";

  const teamId = state.teams[0]?.id ?? "none";
  const roundInit = nextPhase === "round-captain"
    ? {
        currentRound: createNextRoundState(teamId),
        timer: createTimer(getCaptainTimerDuration()),
      }
    : {};

  useGameStore.getState().setState({ players, phase: nextPhase, ...roundInit });
}
