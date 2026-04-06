import { useGameStore } from "./gameStore";
import type { GameState, PlayerData, TeamData } from "@/types/game";

// Team selectors

export function getTeam(state: GameState, teamId: string): TeamData | undefined {
  return state.teams.find((t) => t.id === teamId);
}

export function getActiveTeam(state: GameState): TeamData | undefined {
  if (!state.currentRound) return undefined;
  return getTeam(state, state.currentRound.teamId);
}

export function getOpponentTeam(state: GameState): TeamData | undefined {
  if (!state.currentRound || state.settings.teamMode !== "dual") return undefined;
  return state.teams.find((t) => t.id !== state.currentRound!.teamId);
}

// Player selectors

export function getPlayersInTeam(
  state: GameState,
  teamId: string,
): PlayerData[] {
  return state.players.filter((p) => p.team === teamId);
}

export function getRespondersCount(
  state: GameState,
  teamId: string,
): number {
  return getPlayersInTeam(state, teamId).length - 1;
}

export function getCaptain(state: GameState): PlayerData | undefined {
  if (!state.currentRound) return undefined;
  return state.players.find((p) => p.name === state.currentRound!.captainName);
}

export function isPlayerCaptain(
  state: GameState,
  playerName: string,
): boolean {
  return state.currentRound?.captainName === playerName;
}

export function isPlayerInActiveTeam(
  state: GameState,
  playerName: string,
): boolean {
  if (!state.currentRound) return false;
  const player = state.players.find((p) => p.name === playerName);
  return player?.team === state.currentRound.teamId;
}

// Question selectors

export function getCurrentQuestion(state: GameState) {
  if (!state.currentRound || state.currentRound.questionIndex == null)
    return undefined;
  for (const topic of state.topics) {
    if (state.currentRound.questionIndex < topic.questions.length) {
      return topic.questions[state.currentRound.questionIndex];
    }
  }
  return undefined;
}

export function getCurrentBlitzTask(state: GameState) {
  if (!state.currentRound || !state.currentRound.blitzTaskId) return undefined;
  return state.blitzTasks.find(
    (t) => t.id === state.currentRound!.blitzTaskId,
  );
}

// Game progress

export function isAllPlayersReady(state: GameState): boolean {
  return state.players.length > 0 && state.players.every((p) => p.ready);
}

export function getOnlinePlayers(state: GameState): PlayerData[] {
  return state.players.filter((p) => p.online);
}

// Hook-based selectors for convenience

export function usePhase() {
  return useGameStore((s) => s.phase);
}

export function usePlayers() {
  return useGameStore((s) => s.players);
}

export function useTeams() {
  return useGameStore((s) => s.teams);
}

export function useCurrentRound() {
  return useGameStore((s) => s.currentRound);
}

export function useSettings() {
  return useGameStore((s) => s.settings);
}

export function useTimer() {
  return useGameStore((s) => s.timer);
}
