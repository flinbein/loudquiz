import { describe, it, expect, beforeEach } from "vitest";
import {
  saveGameState,
  loadGameState,
  clearGameState,
  isHost,
} from "./sessionPersistence";
import {
  getApiKey,
  setApiKey,
  getPlayerName,
  setPlayerName,
  getCalibration,
  setCalibration,
  getUsedQuestions,
  addUsedQuestions,
  clearUsedQuestions,
} from "./localPersistence";
import type { GameState } from "@/types/game";

const testState: GameState = {
  phase: "lobby",
  settings: {
    mode: "manual",
    teamMode: "single",
    topicCount: 3,
    questionsPerTopic: 4,
    blitzRoundsPerTeam: 2,
    pastQuestions: [],
  },
  players: [
    { name: "Alice", emoji: "🐱", team: "red", online: true, ready: false },
  ],
  teams: [{ id: "red", score: 0, jokerUsed: false }],
  topics: [],
  blitzTasks: [],
  currentRound: null,
  history: [],
  timer: null,
};

describe("sessionPersistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("round-trip: save and load GameState", () => {
    saveGameState(testState);
    const loaded = loadGameState();
    expect(loaded).toEqual(testState);
  });

  it("returns null when no saved state", () => {
    expect(loadGameState()).toBeNull();
  });

  it("clearGameState removes saved state", () => {
    saveGameState(testState);
    clearGameState();
    expect(loadGameState()).toBeNull();
  });

  it("isHost returns true when state is saved", () => {
    expect(isHost()).toBe(false);
    saveGameState(testState);
    expect(isHost()).toBe(true);
  });
});

describe("localPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("API key: get/set", () => {
    expect(getApiKey()).toBe("");
    setApiKey("sk-test-123");
    expect(getApiKey()).toBe("sk-test-123");
  });

  it("player name: get/set", () => {
    expect(getPlayerName()).toBe("");
    setPlayerName("Alice");
    expect(getPlayerName()).toBe("Alice");
  });

  it("calibration: get/set with defaults", () => {
    const defaults = getCalibration();
    expect(defaults.musicVolume).toBe(0.7);
    expect(defaults.signalVolume).toBe(0.8);
    expect(defaults.hapticEnabled).toBe(true);

    setCalibration({ musicVolume: 0.5, signalVolume: 0.6, hapticEnabled: false, sharedHeadphones: false });
    const updated = getCalibration();
    expect(updated.musicVolume).toBe(0.5);
    expect(updated.hapticEnabled).toBe(false);
  });

  it("returns sharedHeadphones=false by default", () => {
    localStorage.clear();
    const cal = getCalibration();
    expect(cal.sharedHeadphones).toBe(false);
  });

  it("round-trips sharedHeadphones=true", () => {
    setCalibration({
      musicVolume: 0.5,
      signalVolume: 0.5,
      hapticEnabled: true,
      sharedHeadphones: true,
    });
    expect(getCalibration().sharedHeadphones).toBe(true);
  });

  it("merges sharedHeadphones default when missing from stored record", () => {
    localStorage.setItem(
      "loud-quiz-calibration",
      JSON.stringify({ musicVolume: 0.4, signalVolume: 0.6, hapticEnabled: false }),
    );
    const cal = getCalibration();
    expect(cal.sharedHeadphones).toBe(false);
    expect(cal.musicVolume).toBe(0.4);
  });

  it("used questions: add, get, clear", () => {
    expect(getUsedQuestions()).toEqual([]);

    addUsedQuestions(["q1", "q2"]);
    expect(getUsedQuestions()).toEqual(["q1", "q2"]);

    addUsedQuestions(["q2", "q3"]);
    expect(getUsedQuestions()).toEqual(["q1", "q2", "q3"]);

    clearUsedQuestions();
    expect(getUsedQuestions()).toEqual([]);
  });
});
