import { describe, it, expect, beforeEach } from "vitest";
import {
  saveGameState,
  loadGameState,
  clearGameState,
  isHost,
  saveRoomId,
  loadRoomId,
  clearRoomId,
} from "./sessionPersistence";
import {
  getApiKey,
  setApiKey,
  getPlayerName,
  setPlayerName,
  getCalibration,
  setCalibration,
  getUsedQuestionsByTopic,
  getUsedQuestionsTopics,
  addUsedQuestion,
  setUsedQuestionsTopic,
  clearUsedQuestionsTopic,
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

  describe("used questions by topic", () => {
    it("returns empty record initially", () => {
      expect(getUsedQuestionsByTopic()).toEqual({});
      expect(getUsedQuestionsTopics()).toEqual([]);
    });

    it("addUsedQuestion appends to topic", () => {
      addUsedQuestion("Animals", "Name a cat breed");
      addUsedQuestion("Animals", "Name a dog breed");
      addUsedQuestion("Music", "Name a jazz artist");

      expect(getUsedQuestionsByTopic()).toEqual({
        Animals: ["Name a cat breed", "Name a dog breed"],
        Music: ["Name a jazz artist"],
      });
      expect(getUsedQuestionsTopics()).toEqual(["Animals", "Music"]);
    });

    it("addUsedQuestion deduplicates within topic", () => {
      addUsedQuestion("Animals", "Name a cat breed");
      addUsedQuestion("Animals", "Name a cat breed");
      expect(getUsedQuestionsByTopic()).toEqual({
        Animals: ["Name a cat breed"],
      });
    });

    it("setUsedQuestionsTopic overwrites topic questions", () => {
      addUsedQuestion("Animals", "Old question");
      setUsedQuestionsTopic("Animals", ["New question 1", "New question 2"]);
      expect(getUsedQuestionsByTopic()).toEqual({
        Animals: ["New question 1", "New question 2"],
      });
    });

    it("clearUsedQuestionsTopic removes one topic", () => {
      addUsedQuestion("Animals", "Q1");
      addUsedQuestion("Music", "Q2");
      clearUsedQuestionsTopic("Animals");
      expect(getUsedQuestionsByTopic()).toEqual({ Music: ["Q2"] });
      expect(getUsedQuestionsTopics()).toEqual(["Music"]);
    });

    it("clearUsedQuestions removes all", () => {
      addUsedQuestion("Animals", "Q1");
      addUsedQuestion("Music", "Q2");
      clearUsedQuestions();
      expect(getUsedQuestionsByTopic()).toEqual({});
    });
  });
});

describe("roomId persistence", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("saves and loads roomId", () => {
    saveRoomId("123456789");
    expect(loadRoomId()).toBe("123456789");
  });

  it("returns null when no roomId saved", () => {
    expect(loadRoomId()).toBeNull();
  });

  it("clears roomId", () => {
    saveRoomId("123456789");
    clearRoomId();
    expect(loadRoomId()).toBeNull();
  });
});

describe("playerName with sessionStorage priority", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("reads from sessionStorage first", () => {
    sessionStorage.setItem("loud-quiz-player-name", "SessionAlice");
    localStorage.setItem("loud-quiz-player-name", "LocalBob");
    expect(getPlayerName()).toBe("SessionAlice");
  });

  it("falls back to localStorage", () => {
    localStorage.setItem("loud-quiz-player-name", "LocalBob");
    expect(getPlayerName()).toBe("LocalBob");
  });

  it("setPlayerName writes to both storages", () => {
    setPlayerName("Charlie");
    expect(sessionStorage.getItem("loud-quiz-player-name")).toBe("Charlie");
    expect(localStorage.getItem("loud-quiz-player-name")).toBe("Charlie");
  });
});
