import { useGameStore } from "./gameStore";
import type { GameState, PlayerData, TeamData, Topic, Question } from "@/types/game";

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
  let remaining = state.currentRound.questionIndex;
  for (const topic of state.topics) {
    if (remaining < topic.questions.length) {
      return topic.questions[remaining];
    }
    remaining -= topic.questions.length;
  }
  return undefined;
}

export function getQuestionByLinearIndex(
  state: GameState,
  linearIndex: number,
): { topic: Topic; topicIndex: number; question: Question; questionIndex: number } | undefined {
  let remaining = linearIndex;
  for (let ti = 0; ti < state.topics.length; ti++) {
    const topic = state.topics[ti]!;
    if (remaining < topic.questions.length) {
      return { topic, topicIndex: ti, question: topic.questions[remaining]!, questionIndex: remaining };
    }
    remaining -= topic.questions.length;
  }
  return undefined;
}

export function toLinearQuestionIndex(state: GameState, topicIndex: number, questionIndex: number): number {
  let linear = 0;
  for (let i = 0; i < topicIndex; i++) {
    linear += state.topics[i]?.questions?.length ?? 0;
  }
  return linear + questionIndex;
}

export function getCurrentBlitzTask(state: GameState) {
  if (!state.currentRound || state.currentRound.blitzTaskIndex == null) return undefined;
  return state.blitzTasks[state.currentRound.blitzTaskIndex];
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

export function useCurrentQuestion() {
  return useGameStore(getCurrentQuestion);
}

export function useSettings() {
  return useGameStore((s) => s.settings);
}

export function useTimer() {
  return useGameStore((s) => s.timer);
}
