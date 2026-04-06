import { create } from "zustand";
import type { GameState } from "@/types/game";

export const defaultSettings: GameState["settings"] = {
  mode: "manual",
  teamMode: "single",
  topicCount: 3,
  questionsPerTopic: 4,
  blitzRoundsPerTeam: 2,
  pastQuestions: [],
};

export const initialState: GameState = {
  phase: "lobby",
  settings: { ...defaultSettings },
  players: [],
  teams: [],
  topics: [],
  blitzTasks: [],
  currentRound: null,
  history: [],
  timer: null,
};

export interface GameStore extends GameState {
  setState: (partial: Partial<GameState>) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()((set) => ({
  ...initialState,
  setState: (partial) => set(partial),
  resetGame: () => set({ ...initialState, settings: { ...defaultSettings } }),
}));

// Expose store in dev mode for debugging
if (import.meta.env.DEV) {
  (window as unknown as { __store: typeof useGameStore }).__store =
    useGameStore;
}
