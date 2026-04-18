import { describe, it, expect } from "vitest";
import type { GameState } from "@/types/game";
import { phaseLabel } from "./phaseLabel";

// Minimal t() stub that returns the key with interpolated values joined in.
const t = (key: string, vars?: Record<string, unknown>): string =>
  vars ? `${key}:${JSON.stringify(vars)}` : key;

function makeState(overrides: Partial<GameState>): GameState {
  return {
    phase: "lobby",
    settings: {
      mode: "manual",
      teamMode: "single",
      topicCount: 0,
      questionsPerTopic: 0,
      blitzRoundsPerTeam: 0,
      pastQuestions: [],
    },
    players: [],
    teams: [],
    topics: [],
    blitzTasks: [],
    currentRound: null,
    history: [],
    timer: null,
    ...overrides,
  };
}

describe("phaseLabel", () => {
  it("returns topics key for topics-collecting", () => {
    const state = makeState({ phase: "topics-collecting" });
    expect(phaseLabel(state, t)).toBe("home.resumePhase.topics");
  });

  it("returns topics key for topics-generating", () => {
    const state = makeState({ phase: "topics-generating" });
    expect(phaseLabel(state, t)).toBe("home.resumePhase.topics");
  });

  it("returns topics key for topics-preview", () => {
    const state = makeState({ phase: "topics-preview" });
    expect(phaseLabel(state, t)).toBe("home.resumePhase.topics");
  });

  it("round phase: current = played rounds + 1, total = all questions across topics", () => {
    const state = makeState({
      phase: "round-active",
      topics: [
        { name: "A", difficulty: 1, questions: [{ text: "q1", answer: "" }, { text: "q2", answer: "" }] },
        { name: "B", difficulty: 1, questions: [{ text: "q3", answer: "" }] },
      ] as GameState["topics"],
      history: [
        { type: "round", teamId: "red", captainName: "x", score: 0, jokerUsed: false, playerResults: [], difficulty: 1, topicIndex: 0, bonusTimeApplied: false, bonusTime: 0, bonusTimeMultiplier: 1, groups: [] },
        { type: "blitz", teamId: "red", captainName: "x", score: 0, jokerUsed: false, playerResults: [], difficulty: 1, topicIndex: -1, bonusTimeApplied: false, bonusTime: 0, bonusTimeMultiplier: 1, groups: [] },
      ],
    });
    expect(phaseLabel(state, t)).toBe(`home.resumePhase.round:${JSON.stringify({ current: 2, total: 3 })}`);
  });

  it("round phase with empty history: current = 1", () => {
    const state = makeState({
      phase: "round-captain",
      topics: [{ name: "A", difficulty: 1, questions: [{ text: "q1", answer: "" }] }] as GameState["topics"],
    });
    expect(phaseLabel(state, t)).toBe(`home.resumePhase.round:${JSON.stringify({ current: 1, total: 1 })}`);
  });

  it("blitz phase: current = played blitz + 1, total = blitzTasks length", () => {
    const state = makeState({
      phase: "blitz-active",
      blitzTasks: [
        { title: "B1", items: [] },
        { title: "B2", items: [] },
        { title: "B3", items: [] },
      ] as GameState["blitzTasks"],
      history: [
        { type: "blitz", teamId: "red", captainName: "x", score: 0, jokerUsed: false, playerResults: [], difficulty: 1, topicIndex: -1, bonusTimeApplied: false, bonusTime: 0, bonusTimeMultiplier: 1, groups: [] },
      ],
    });
    expect(phaseLabel(state, t)).toBe(`home.resumePhase.blitz:${JSON.stringify({ current: 2, total: 3 })}`);
  });

  it("returns empty string for lobby / finale (caller should not invoke for these)", () => {
    expect(phaseLabel(makeState({ phase: "lobby" }), t)).toBe("");
    expect(phaseLabel(makeState({ phase: "finale" }), t)).toBe("");
  });
});
