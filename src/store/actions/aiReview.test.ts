import { beforeEach, describe, it, expect } from "vitest";
import { useGameStore } from "@/store/gameStore";
import type { GameState } from "@/types/game";
import {
  beginAiReview,
  onAiReviewSuccess,
  onAiReviewError,
  retryAiReview,
  fallbackReviewToManual,
} from "./aiReview";

function setupState(overrides: Partial<GameState> = {}): void {
  useGameStore.setState({
    phase: "round-review",
    settings: {
      mode: "ai",
      teamMode: "single",
      topicCount: 3,
      questionsPerTopic: 3,
      blitzRoundsPerTeam: 1,
      pastQuestions: [],
    },
    players: [
      { name: "alice", team: "red", emoji: "🦊", online: true, ready: true },
      { name: "bob", team: "red", emoji: "🐻", online: true, ready: true },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }],
    topics: [],
    blitzTasks: [],
    history: [],
    timer: null,
    currentRound: {
      type: "round",
      teamId: "red",
      captainName: "alice",
      questionIndex: 0,
      jokerActive: false,
      answers: { bob: { text: "apple", timestamp: 0 } },
      activeTimerStartedAt: 0,
      bonusTime: 0,
      reviewResult: {
        evaluations: [],
        groups: [],
        bonusTime: 0,
        bonusTimeMultiplier: 0,
        bonusTimeApplied: false,
        jokerApplied: false,
        score: 0,
        aiStatus: "idle",
      },
    },
    ...overrides,
  });
}

describe("beginAiReview", () => {
  beforeEach(() => setupState());

  it("only runs when mode=ai and aiStatus=idle", () => {
    beginAiReview();
    expect(useGameStore.getState().currentRound?.reviewResult?.aiStatus).toBe("loading");
  });

  it("no-op if mode=manual", () => {
    useGameStore.setState({
      settings: { ...useGameStore.getState().settings, mode: "manual" },
    });
    beginAiReview();
    expect(useGameStore.getState().currentRound?.reviewResult?.aiStatus).toBe("idle");
  });

  it("no-op if already loading", () => {
    useGameStore.setState((s) => ({
      currentRound: {
        ...s.currentRound!,
        reviewResult: { ...s.currentRound!.reviewResult!, aiStatus: "loading" },
      },
    }));
    beginAiReview();
    expect(useGameStore.getState().currentRound?.reviewResult?.aiStatus).toBe("loading");
  });
});

describe("onAiReviewSuccess", () => {
  beforeEach(() => setupState());

  it("fills evaluations and marks aiStatus=done", () => {
    beginAiReview();
    onAiReviewSuccess({
      evaluations: [{ playerName: "bob", correct: true }],
      groups: [["bob"]],
    });
    const rr = useGameStore.getState().currentRound?.reviewResult!;
    expect(rr.aiStatus).toBe("done");
    expect(rr.evaluations).toEqual([{ playerName: "bob", correct: true }]);
    expect(rr.groups).toEqual([["bob"]]);
  });
});

describe("onAiReviewError", () => {
  beforeEach(() => setupState());

  it("marks aiStatus=error with message", () => {
    beginAiReview();
    onAiReviewError("boom");
    const rr = useGameStore.getState().currentRound?.reviewResult!;
    expect(rr.aiStatus).toBe("error");
    expect(rr.aiError).toBe("boom");
  });
});

describe("retryAiReview & fallbackReviewToManual", () => {
  beforeEach(() => setupState());

  it("retryAiReview resets to loading, clears aiError", () => {
    beginAiReview();
    onAiReviewError("boom");
    retryAiReview();
    const rr = useGameStore.getState().currentRound?.reviewResult!;
    expect(rr.aiStatus).toBe("loading");
    expect(rr.aiError).toBeUndefined();
  });

  it("fallbackReviewToManual resets to idle (manual UI active)", () => {
    beginAiReview();
    onAiReviewError("boom");
    fallbackReviewToManual();
    const rr = useGameStore.getState().currentRound?.reviewResult!;
    expect(rr.aiStatus).toBe("idle");
    expect(rr.aiError).toBeUndefined();
  });
});
