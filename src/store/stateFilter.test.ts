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
    teams: [{ id: "red", color: "red", score: 0, jokerUsed: false }],
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
        id: "blitz-1",
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
      bonusTime: 10000,
    },
    history: [],
    timer: { startedAt: Date.now(), duration: 60000 },
    ...overrides,
  };
}

describe("filterStateForPlayer", () => {
  describe("question text visibility", () => {
    it("captain sees question text in round-active", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.topics[0].questions[0].text).toBe("Name a big cat");
    });

    it("responder does NOT see question text in round-active (single mode)", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.topics[0].questions[0].text).toBe("");
    });

    it("non-targeted questions remain visible", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      // questionIndex=0 is hidden, but question at index 1 should remain
      expect(filtered.topics[0].questions[1].text).toBe("Name a fish");
    });

    it("opponent sees question text in dual mode", () => {
      const state = createTestState({
        settings: {
          mode: "manual",
          teamMode: "dual",
          topicCount: 3,
          questionsPerTopic: 4,
          blitzRoundsPerTeam: 2,
          pastQuestions: [],
        },
        players: [
          { name: "Alice", emoji: "🐱", team: "red", online: true, ready: true },
          { name: "Bob", emoji: "🐶", team: "red", online: true, ready: true },
          { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        ],
        teams: [
          { id: "red", color: "red", score: 0, jokerUsed: false },
          { id: "blue", color: "blue", score: 0, jokerUsed: false },
        ],
      });

      const filtered = filterStateForPlayer(state, "Dave");
      expect(filtered.topics[0].questions[0].text).toBe("Name a big cat");
    });

    it("active team responder does NOT see question in dual mode", () => {
      const state = createTestState({
        settings: {
          mode: "manual",
          teamMode: "dual",
          topicCount: 3,
          questionsPerTopic: 4,
          blitzRoundsPerTeam: 2,
          pastQuestions: [],
        },
        players: [
          { name: "Alice", emoji: "🐱", team: "red", online: true, ready: true },
          { name: "Bob", emoji: "🐶", team: "red", online: true, ready: true },
          { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        ],
        teams: [
          { id: "red", color: "red", score: 0, jokerUsed: false },
          { id: "blue", color: "blue", score: 0, jokerUsed: false },
        ],
      });

      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.topics[0].questions[0].text).toBe("");
    });
  });

  describe("answer visibility", () => {
    it("player sees own answer before review", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.currentRound!.answers["Bob"].text).toBe("lion");
    });

    it("player does NOT see other answers before review", () => {
      const state = createTestState();
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.currentRound!.answers["Charlie"].text).toBe("");
    });

    it("all answers visible during round-review", () => {
      const state = createTestState({ phase: "round-review" });
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.currentRound!.answers["Charlie"].text).toBe("tiger");
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
          blitzTaskId: "blitz-1",
          jokerActive: false,
          answers: {},
          bonusTime: 0,
        },
      });
      const filtered = filterStateForPlayer(state, "Alice");
      expect(filtered.blitzTasks[0].items[0].text).toBe("Cat");
    });

    it("non-captain does NOT see blitz task items", () => {
      const state = createTestState({
        phase: "blitz-pick",
        currentRound: {
          type: "blitz",
          teamId: "red",
          captainName: "Alice",
          blitzTaskId: "blitz-1",
          jokerActive: false,
          answers: {},
          bonusTime: 0,
        },
      });
      const filtered = filterStateForPlayer(state, "Bob");
      expect(filtered.blitzTasks[0].items[0].text).toBe("");
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
});
