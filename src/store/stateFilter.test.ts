import { describe, it, expect } from "vitest";
import { filterStateForPlayer } from "./stateFilter";
import type { GameState } from "@/types/game";

function createTestState(overrides?: Partial<GameState>): GameState {
  return {
    phase: "round-active",
    settings: {
      mode: "manual",
      teamMode: "single",
      topicCount: 3,
      questionsPerTopic: 4,
      blitzRoundsPerTeam: 2,
      pastQuestions: [],
    },
    players: [
      { name: "Alice", emoji: "🐱", team: "red", online: true, ready: true },
      { name: "Bob", emoji: "🐶", team: "red", online: true, ready: true },
      { name: "Charlie", emoji: "🐸", team: "red", online: true, ready: true },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }],
    topics: [
      {
        name: "Animals",
        questions: [
          { text: "Name a big cat", difficulty: 100, acceptedAnswers: ["lion", "tiger"] },
          { text: "Name a fish", difficulty: 150, acceptedAnswers: ["salmon", "trout"] },
        ],
      },
    ],
    blitzTasks: [
      {
        items: [
          { text: "Cat", difficulty: 200 },
          { text: "Democracy", difficulty: 380 },
        ],
      },
    ],
    currentRound: {
      type: "round",
      teamId: "red",
      captainName: "Alice",
      questionIndex: 0,
      jokerActive: false,
      answers: {
        Bob: { text: "lion", timestamp: 5000 },
        Charlie: { text: "tiger", timestamp: 8000 },
      },
      activeTimerStartedAt: 0,
      bonusTime: 10000,
    },
    history: [],
    timer: { startedAt: performance.now(), duration: 60000 },
    ...overrides,
  };
}

describe("filterStateForPlayer", () => {
  describe("question text visibility", () => {
    it("captain sees question text in round-active", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.topics[0]?.questions[0]?.text).toBe("Name a big cat");
    });

    it("responder sees question text in round-active (no longer scrubbed)", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.topics[0]?.questions[0]?.text).toBe("Name a big cat");
    });

    it("non-targeted questions remain visible", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.topics[0]?.questions[1]?.text).toBe("Name a fish");
    });

    it("dual-mode: question text not scrubbed for any player", () => {
      const state = createTestState({
        settings: {
          mode: "manual", teamMode: "dual", topicCount: 3,
          questionsPerTopic: 4, blitzRoundsPerTeam: 2, pastQuestions: [],
        },
        players: [
          { name: "Alice", emoji: "🐱", team: "red", online: true, ready: true },
          { name: "Bob", emoji: "🐶", team: "red", online: true, ready: true },
          { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        ],
        teams: [
          { id: "red", score: 0, jokerUsed: false },
          { id: "blue", score: 0, jokerUsed: false },
        ],
      });
      for (const name of ["Alice", "Bob", "Dave"]) {
        const filtered = filterStateForPlayer(state, name);
        expect(filtered.topics[0]?.questions[0]?.text).toBe("Name a big cat");
      }
    });
  });

  describe("answer visibility", () => {
    it("player sees own answer before review", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.currentRound?.answers?.["Bob"]?.text).toBe("lion");
    });

    it("player does NOT see other answers before review", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.currentRound?.answers?.["Charlie"]?.text).toBe("");
    });

    it("all answers visible during round-review", () => {
      const state = createTestState({ phase: "round-review" });
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.currentRound?.answers?.["Charlie"]?.text).toBe("tiger");
    });
  });

  describe("blitz-pick visibility", () => {
    it("captain sees blitz task items", () => {
      const state = createTestState({
        phase: "blitz-pick",
        currentRound: {
          type: "blitz",
          teamId: "red",
          captainName: "Alice",
          blitzTaskIndex: 0,
          jokerActive: false,
          answers: {},
          activeTimerStartedAt: 0,
          bonusTime: 0,
        },
      });
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.blitzTasks[0]?.items?.[0]?.text).toBe("Cat");
    });

    it("non-captain sees blitz task items (no longer scrubbed)", () => {
      const state = createTestState({
        phase: "blitz-pick",
        currentRound: {
          type: "blitz",
          teamId: "red",
          captainName: "Alice",
          blitzTaskIndex: 0,
          jokerActive: false,
          answers: {},
          activeTimerStartedAt: 0,
          bonusTime: 0,
        },
      });
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.blitzTasks?.[0]?.items?.[0]?.text).toBe("Cat");
    });
  });

  it("returns state unchanged when no current round", () => {
    const state = createTestState({
      phase: "lobby",
      currentRound: null,
    });
    const filtered = filterStateForPlayer(state, "Alice");
    expect(filtered).toBe(state);
  });

  describe("topics-collecting state filter", () => {
    function topicsCollectingState(): GameState {
      return createTestState({
        phase: "topics-collecting",
        currentRound: null,
        topicsSuggest: {
          suggestions: {
            Alice: ["a", "b"],
            Bob: ["x"],
          },
          noIdeas: ["Charlie"],
          timerEndsAt: 123456,
          manualTopics: null,
          generationStep: null,
          aiError: null,
        },
      });
    }

    it("player sees only their own suggestions", () => {
      const state = topicsCollectingState();
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.topicsSuggest?.suggestions).toEqual({ Alice: ["a", "b"] });
    });

    it("player with no suggestions gets empty array entry", () => {
      const state = topicsCollectingState();
      const filtered = filterStateForPlayer(state, "Charlie");
      expect(filtered.topicsSuggest?.suggestions).toEqual({ Charlie: [] });
    });

    it("noIdeas, timer, manualTopics pass through unchanged", () => {
      const state = topicsCollectingState();
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.topicsSuggest?.noIdeas).toEqual(["Charlie"]);
      expect(filtered.topicsSuggest?.timerEndsAt).toBe(123456);
      expect(filtered.topicsSuggest?.manualTopics).toBeNull();
    });

    it("topics-generating phase also filters suggestions", () => {
      const state = createTestState({
        phase: "topics-generating",
        currentRound: null,
        topicsSuggest: {
          suggestions: { Alice: ["a"], Bob: ["b"] },
          noIdeas: [],
          timerEndsAt: null,
          manualTopics: null,
          generationStep: "topics",
          aiError: null,
        },
      });
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.topicsSuggest?.suggestions).toEqual({ Alice: ["a"] });
    });
  });

  describe("round-review AI evaluations hidden until done", () => {
    function reviewState(aiStatus: "idle" | "loading" | "done" | "error"): GameState {
      return createTestState({
        phase: "round-review",
        settings: {
          mode: "ai",
          teamMode: "single",
          topicCount: 3,
          questionsPerTopic: 4,
          blitzRoundsPerTeam: 2,
          pastQuestions: [],
        },
        currentRound: {
          type: "round",
          teamId: "red",
          captainName: "Alice",
          questionIndex: 0,
          jokerActive: false,
          answers: {
            Bob: { text: "lion", timestamp: 5000 },
            Charlie: { text: "tiger", timestamp: 8000 },
          },
          activeTimerStartedAt: 0,
          bonusTime: 10000,
          reviewResult: {
            evaluations: [
              { playerName: "Bob", correct: true },
              { playerName: "Charlie", correct: false },
            ],
            groups: [["Bob"], ["Charlie"]],
            bonusTime: 0,
            bonusTimeMultiplier: 0,
            bonusTimeApplied: false,
            jokerApplied: false,
            score: 0,
            aiStatus,
          },
        },
      });
    }

    it("evaluations hidden while aiStatus=loading", () => {
      const filtered = filterStateForPlayer(reviewState("loading"), "Bob");
      expect(filtered.currentRound?.reviewResult?.evaluations).toEqual([]);
    });

    it("evaluations hidden while aiStatus=idle", () => {
      const filtered = filterStateForPlayer(reviewState("idle"), "Bob");
      expect(filtered.currentRound?.reviewResult?.evaluations).toEqual([]);
    });

    it("evaluations visible once aiStatus=done", () => {
      const filtered = filterStateForPlayer(reviewState("done"), "Bob");
      expect(filtered.currentRound?.reviewResult?.evaluations).toHaveLength(2);
    });

    it("evaluations visible once aiStatus=error (fallback UI needs them)", () => {
      const filtered = filterStateForPlayer(reviewState("error"), "Bob");
      expect(filtered.currentRound?.reviewResult?.evaluations).toHaveLength(2);
    });
  });
});
