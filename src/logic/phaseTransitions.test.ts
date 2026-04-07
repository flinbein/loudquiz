import { describe, it, expect } from "vitest";
import { getNextRoundPhase, getNextPhaseAfterReview, getPlayedQuestionIndices, createNextRoundState, getTotalQuestionCount } from "./phaseTransitions";
import type { RoundResult } from "@/types/game";

describe("getNextRoundPhase", () => {
  it("round-captain → round-pick", () => {
    expect(getNextRoundPhase("round-captain")).toBe("round-pick");
  });
  it("round-pick → round-ready", () => {
    expect(getNextRoundPhase("round-pick")).toBe("round-ready");
  });
  it("round-ready → round-active", () => {
    expect(getNextRoundPhase("round-ready")).toBe("round-active");
  });
  it("round-active → round-answer", () => {
    expect(getNextRoundPhase("round-active")).toBe("round-answer");
  });
  it("round-answer → round-review", () => {
    expect(getNextRoundPhase("round-answer")).toBe("round-review");
  });
});

describe("getNextPhaseAfterReview", () => {
  it("returns round-captain when unplayed questions remain", () => {
    const history: RoundResult[] = [
      { type: "round", teamId: "t1", captainName: "A", questionIndex: 0, score: 100, jokerUsed: false },
    ];
    expect(getNextPhaseAfterReview(4, history, 0)).toBe("round-captain");
  });

  it("returns blitz-captain when all questions played and blitz tasks exist", () => {
    const history: RoundResult[] = [
      { type: "round", teamId: "t1", captainName: "A", questionIndex: 0, score: 100, jokerUsed: false },
      { type: "round", teamId: "t1", captainName: "B", questionIndex: 1, score: 100, jokerUsed: false },
    ];
    expect(getNextPhaseAfterReview(2, history, 3)).toBe("blitz-captain");
  });

  it("returns finale when all questions played and no blitz tasks", () => {
    const history: RoundResult[] = [
      { type: "round", teamId: "t1", captainName: "A", questionIndex: 0, score: 100, jokerUsed: false },
    ];
    expect(getNextPhaseAfterReview(1, history, 0)).toBe("finale");
  });
});

describe("getPlayedQuestionIndices", () => {
  it("returns empty for no history", () => {
    expect(getPlayedQuestionIndices([])).toEqual([]);
  });

  it("returns indices of played round questions", () => {
    const history: RoundResult[] = [
      { type: "round", teamId: "t1", captainName: "A", questionIndex: 0, score: 100, jokerUsed: false },
      { type: "round", teamId: "t1", captainName: "B", questionIndex: 3, score: 200, jokerUsed: false },
      { type: "blitz", teamId: "t1", captainName: "C", blitzTaskId: "b1", score: 50, jokerUsed: false },
    ];
    expect(getPlayedQuestionIndices(history)).toEqual([0, 3]);
  });
});

describe("getTotalQuestionCount", () => {
  it("sums questions across all topics", () => {
    const topics = [
      { name: "T1", questions: [{ text: "q1", difficulty: 100, acceptedAnswers: [] }, { text: "q2", difficulty: 100, acceptedAnswers: [] }] },
      { name: "T2", questions: [{ text: "q3", difficulty: 200, acceptedAnswers: [] }] },
    ];
    expect(getTotalQuestionCount(topics)).toBe(3);
  });
});

describe("createNextRoundState", () => {
  it("creates a fresh round state with team id", () => {
    const round = createNextRoundState("team-red");
    expect(round.type).toBe("round");
    expect(round.teamId).toBe("team-red");
    expect(round.captainName).toBe("");
    expect(round.jokerActive).toBe(false);
    expect(round.answers).toEqual({});
    expect(round.bonusTime).toBe(0);
    expect(round.reviewResult).toBeUndefined();
  });
});
