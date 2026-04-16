import { describe, it, expect } from "vitest";
import { calculateRoundScore, calculateBlitzScore, calculateBonusMultiplier, checkBonusConditions } from "./scoring";
import type { PlayerAnswer, AnswerEvaluation } from "@/types/game";

describe("calculateRoundScore", () => {
  it("scores basic round: difficulty × correctCount", () => {
    expect(calculateRoundScore(100, 4, false, 1, false)).toBe(400);
  });

  it("scores zero when no correct answers", () => {
    expect(calculateRoundScore(100, 0, false, 1, false)).toBe(0);
  });

  it("doubles with joker", () => {
    expect(calculateRoundScore(100, 4, true, 1, false)).toBe(800);
  });

  it("applies bonus multiplier", () => {
    expect(calculateRoundScore(100, 4, false, 1.2, true)).toBe(480);
  });

  it("applies joker + bonus", () => {
    expect(calculateRoundScore(100, 4, true, 1.2, true)).toBe(960);
  });

  it("handles partial correct (2 out of 4)", () => {
    expect(calculateRoundScore(100, 2, false, 1, false)).toBe(200);
  });
});

describe("calculateBonusMultiplier", () => {
  it("returns multiplier from remaining time", () => {
    expect(calculateBonusMultiplier(12, 60)).toBeCloseTo(1.2);
  });

  it("returns 1 when no bonus time", () => {
    expect(calculateBonusMultiplier(0, 60)).toBe(1);
  });
});

describe("checkBonusConditions", () => {
  const activeDuration = 60000;
  // Timer started at T=10000, ends at T=10000+60000=70000
  const timerStartedAt = 10000;

  it("grants bonus when all correct, unique, and answered in time", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 20000 },   // 10s into the phase
      Carol: { text: "answer2", timestamp: 25000 },  // 15s into the phase
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: true },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration, timerStartedAt);
    expect(result.hasBonus).toBe(true);
    // Timer ends at 70000, last answer at 25000 → bonusTime = (70000-25000)/1000 = 45s
    expect(result.bonusTime).toBe(45000);
  });

  it("denies bonus when not all correct", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 20000 },
      Carol: { text: "wrong", timestamp: 25000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: false },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration, timerStartedAt);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when answers are merged (not unique)", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "same", timestamp: 20000 },
      Carol: { text: "same", timestamp: 25000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: true },
    ];
    const groups = [["Bob", "Carol"]]; // merged
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration, timerStartedAt);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when not all team members answered", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 20000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
    ];
    const groups = [["Bob"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration, timerStartedAt);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when a player gave up (empty text)", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 20000 },
      Carol: { text: "", timestamp: 25000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: false },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration, timerStartedAt);
    expect(result.hasBonus).toBe(false);
  });
});

describe("calculateBlitzScore", () => {
  it("returns 0 for wrong answers", () => {
    expect(calculateBlitzScore(300, 2, false, 20000, 60000)).toBe(0);
  });

  it("returns 0 for playerNumber <= 0", () => {
    expect(calculateBlitzScore(300, 0, true, 20000, 60000)).toBe(0);
  });

  it("scales score by playerNumber", () => {
    // No bonus time → multiplier 1 → 200 × 3 × 1 = 600
    expect(calculateBlitzScore(200, 3, true, 0, 60000)).toBe(600);
  });

  it("applies bonus time multiplier", () => {
    // 300 × 1 × (1 + 30000/60000) = 300 × 1.5 = 450
    expect(calculateBlitzScore(300, 1, true, 30000, 60000)).toBe(450);
  });

  it("rounds the result", () => {
    // 350 × 2 × (1 + 10000/60000) = 350 × 2 × 1.1666… ≈ 816.67 → 817
    expect(calculateBlitzScore(350, 2, true, 10000, 60000)).toBe(817);
  });
});
