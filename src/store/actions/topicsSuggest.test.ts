import { beforeEach, describe, it, expect } from "vitest";
import { useGameStore } from "@/store/gameStore";
import {
  submitTopicSuggestion,
  playerNoIdeas,
  startFirstRound,
} from "./topicsSuggest";
import type { GameState } from "@/types/game";

function setupState(overrides: Partial<GameState> = {}): void {
  useGameStore.setState({
    phase: "topics-collecting",
    settings: {
      mode: "ai",
      teamMode: "single",
      topicCount: 3,
      questionsPerTopic: 3,
      blitzRoundsPerTeam: 1,
      pastQuestions: [],
    },
    players: [
      { name: "alice", team: "red", emoji: "🦊", online: true, ready: false },
      { name: "bob", team: "red", emoji: "🐻", online: true, ready: false },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }],
    topics: [],
    blitzTasks: [],
    currentRound: null,
    history: [],
    timer: null,
    topicsSuggest: {
      suggestions: {},
      noIdeas: [],
      timerEndsAt: performance.now() + 60000,
      manualTopics: null,
      generationStep: null,
      aiError: null,
    },
    ...overrides,
  });
}

describe("submitTopicSuggestion", () => {
  beforeEach(() => setupState());

  it("adds topic in order", () => {
    submitTopicSuggestion("alice", "Football");
    submitTopicSuggestion("alice", "Movies");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toEqual([
      "Football",
      "Movies",
    ]);
  });

  it("ignores when at topicCount limit", () => {
    submitTopicSuggestion("alice", "a");
    submitTopicSuggestion("alice", "b");
    submitTopicSuggestion("alice", "c");
    submitTopicSuggestion("alice", "d");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toHaveLength(3);
  });

  it("ignores when player in noIdeas", () => {
    useGameStore.setState((s) => ({
      topicsSuggest: { ...s.topicsSuggest!, noIdeas: ["alice"] },
    }));
    submitTopicSuggestion("alice", "x");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toBeUndefined();
  });

  it("ignores when manualTopics !== null", () => {
    useGameStore.setState((s) => ({
      topicsSuggest: { ...s.topicsSuggest!, manualTopics: [] },
    }));
    submitTopicSuggestion("alice", "x");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toBeUndefined();
  });

  it("ignores empty/whitespace", () => {
    submitTopicSuggestion("alice", "   ");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toBeUndefined();
  });

  it("ignores when phase is not topics-collecting", () => {
    useGameStore.setState({ phase: "lobby" });
    submitTopicSuggestion("alice", "x");
    expect(useGameStore.getState().topicsSuggest?.suggestions.alice).toBeUndefined();
  });
});

describe("playerNoIdeas", () => {
  beforeEach(() => setupState());

  it("adds player to noIdeas", () => {
    playerNoIdeas("alice");
    expect(useGameStore.getState().topicsSuggest?.noIdeas).toContain("alice");
  });

  it("idempotent", () => {
    playerNoIdeas("alice");
    playerNoIdeas("alice");
    expect(useGameStore.getState().topicsSuggest?.noIdeas).toEqual(["alice"]);
  });
});

describe("startFirstRound", () => {
  beforeEach(() =>
    setupState({ phase: "topics-preview", topics: [{ name: "X", questions: [] }] }),
  );

  it("transitions to round-captain with given teamId", () => {
    startFirstRound("red");
    const s = useGameStore.getState();
    expect(s.phase).toBe("round-captain");
    expect(s.currentRound?.teamId).toBe("red");
  });

  it('resolves "random" to a valid team id', () => {
    startFirstRound("random");
    const s = useGameStore.getState();
    expect(s.phase).toBe("round-captain");
    expect(["red"]).toContain(s.currentRound?.teamId);
  });

  it("no-op when phase != topics-preview", () => {
    useGameStore.setState({ phase: "lobby" });
    startFirstRound("red");
    expect(useGameStore.getState().phase).toBe("lobby");
  });
});
