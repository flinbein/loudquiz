import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { GameState } from "@/types/game";
import { useHomeSession } from "./useHomeSession";

function setStoredState(state: GameState | null, roomId: string | null): void {
  sessionStorage.clear();
  if (state) sessionStorage.setItem("loud-quiz-game-state", JSON.stringify(state));
  if (roomId) sessionStorage.setItem("loud-quiz-room-id", roomId);
}

function makeState(phase: GameState["phase"], overrides: Partial<GameState> = {}): GameState {
  return {
    phase,
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

describe("useHomeSession", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => sessionStorage.clear());

  it("returns fresh when no stored state", () => {
    const { result } = renderHook(() => useHomeSession());
    expect(result.current).toEqual({ kind: "fresh" });
  });

  it("returns fresh when state exists but roomId does not", () => {
    setStoredState(makeState("round-active"), null);
    const { result } = renderHook(() => useHomeSession());
    expect(result.current).toEqual({ kind: "fresh" });
  });

  it("returns fresh when phase is lobby", () => {
    setStoredState(makeState("lobby"), "QUIZ42");
    const { result } = renderHook(() => useHomeSession());
    expect(result.current).toEqual({ kind: "fresh" });
  });

  it("returns fresh when phase is finale", () => {
    setStoredState(makeState("finale"), "QUIZ42");
    const { result } = renderHook(() => useHomeSession());
    expect(result.current).toEqual({ kind: "fresh" });
  });

  it("returns resume for round-active with correct roomId and phase", () => {
    setStoredState(
      makeState("round-active", {
        topics: [{ name: "A", difficulty: 1, questions: [{ text: "q", answer: "" }] }] as unknown as GameState["topics"],
      }),
      "QUIZ42",
    );
    const { result } = renderHook(() => useHomeSession());
    expect(result.current.kind).toBe("resume");
    if (result.current.kind === "resume") {
      expect(result.current.roomId).toBe("QUIZ42");
      expect(result.current.phase).toBe("round-active");
      expect(typeof result.current.phaseLabel).toBe("string");
      expect(result.current.phaseLabel.length).toBeGreaterThan(0);
    }
  });

  it("returns resume for blitz-active", () => {
    setStoredState(
      makeState("blitz-active", {
        blitzTasks: [{ title: "B", items: [] }] as unknown as GameState["blitzTasks"],
      }),
      "QUIZ42",
    );
    const { result } = renderHook(() => useHomeSession());
    expect(result.current.kind).toBe("resume");
    if (result.current.kind === "resume") {
      expect(result.current.phase).toBe("blitz-active");
    }
  });
});
