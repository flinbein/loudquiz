import { beforeEach, describe, it, expect } from "vitest";
import { useGameStore } from "@/store/gameStore";
import {
  submitTopicSuggestion,
  playerNoIdeas,
  startFirstRound,
  hostStartManualTopics,
  hostCancelManualTopics,
  hostSubmitManualTopics,
  onAiStepSuccess,
  onAiStepError,
  retryAiStep,
  fallbackToManualTopics,
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

describe("hostStartManualTopics / Cancel / Submit", () => {
  beforeEach(() => setupState());

  it("hostStartManualTopics sets manualTopics=[] and stops timer", () => {
    hostStartManualTopics();
    const ts = useGameStore.getState().topicsSuggest!;
    expect(ts.manualTopics).toEqual([]);
    expect(ts.timerEndsAt).toBeNull();
    expect(useGameStore.getState().timer).toBeNull();
  });

  it("hostCancelManualTopics restores null and restarts timer", () => {
    hostStartManualTopics();
    hostCancelManualTopics();
    const s = useGameStore.getState();
    expect(s.topicsSuggest?.manualTopics).toBeNull();
    expect(s.timer).not.toBeNull();
  });

  it("hostSubmitManualTopics validates non-empty and transitions to topics-generating with questions step", () => {
    hostStartManualTopics();
    hostSubmitManualTopics(["A", "B"]);
    const s = useGameStore.getState();
    expect(s.phase).toBe("topics-generating");
    expect(s.topicsSuggest?.generationStep).toBe("questions");
    expect(s.topics.map((t) => t.name)).toEqual(["A", "B"]);
  });

  it("hostSubmitManualTopics ignores empty array", () => {
    hostStartManualTopics();
    hostSubmitManualTopics([]);
    expect(useGameStore.getState().phase).toBe("topics-collecting");
  });
});

describe("AI step callbacks", () => {
  beforeEach(() => {
    setupState({
      phase: "topics-generating",
      topicsSuggest: {
        suggestions: {},
        noIdeas: [],
        timerEndsAt: null,
        manualTopics: null,
        generationStep: "topics",
        aiError: null,
      },
    });
  });

  it("onAiStepSuccess('topics', result) advances to questions step and stores topic names", () => {
    onAiStepSuccess("topics", { topics: ["Films", "Music", "Sports"] });
    const s = useGameStore.getState();
    expect(s.topicsSuggest?.generationStep).toBe("questions");
    expect(s.topics.map((t) => t.name)).toEqual(["Films", "Music", "Sports"]);
  });

  it("onAiStepSuccess('questions', ...) advances to blitz step and fills questions", () => {
    useGameStore.setState((s) => ({
      topics: [{ name: "Films", questions: [] }],
      topicsSuggest: { ...s.topicsSuggest!, generationStep: "questions" },
    }));
    onAiStepSuccess("questions", {
      topics: [
        {
          name: "Films",
          questions: [{ text: "Q", difficulty: 100, acceptedAnswers: ["A"] }],
        },
      ],
    });
    const s = useGameStore.getState();
    expect(s.topics[0]!.questions).toHaveLength(1);
    expect(s.topicsSuggest?.generationStep).toBe("blitz");
  });

  it("onAiStepSuccess('blitz', ...) transitions to topics-preview", () => {
    useGameStore.setState((s) => ({
      topicsSuggest: { ...s.topicsSuggest!, generationStep: "blitz" },
    }));
    onAiStepSuccess("blitz", {
      blitzTasks: [
        {
          items: [
            { text: "t1", difficulty: 200 },
            { text: "t2", difficulty: 210 },
            { text: "t3", difficulty: 220 },
          ],
        },
      ],
    });
    const s = useGameStore.getState();
    expect(s.phase).toBe("topics-preview");
    expect(s.blitzTasks).toHaveLength(1);
    expect(s.topicsSuggest).toBeUndefined();
  });

  it("onAiStepError records aiError without changing phase", () => {
    onAiStepError("topics", "boom");
    const s = useGameStore.getState();
    expect(s.phase).toBe("topics-generating");
    expect(s.topicsSuggest?.aiError).toEqual({ step: "topics", message: "boom" });
  });

  it("retryAiStep clears aiError keeping same generationStep", () => {
    onAiStepError("topics", "boom");
    retryAiStep();
    const s = useGameStore.getState();
    expect(s.topicsSuggest?.aiError).toBeNull();
    expect(s.topicsSuggest?.generationStep).toBe("topics");
  });

  it("fallbackToManualTopics only allowed when aiError.step==='topics'", () => {
    onAiStepError("topics", "boom");
    fallbackToManualTopics();
    const s = useGameStore.getState();
    expect(s.phase).toBe("topics-collecting");
    expect(s.topicsSuggest?.manualTopics).toEqual([]);
    expect(s.topicsSuggest?.aiError).toBeNull();
    expect(s.timer).toBeNull();
  });

  it("fallbackToManualTopics no-op when aiError.step !== 'topics'", () => {
    onAiStepError("questions", "boom");
    fallbackToManualTopics();
    expect(useGameStore.getState().phase).toBe("topics-generating");
  });
});
