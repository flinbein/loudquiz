import { describe, it, expect } from "vitest";
import { calculateRoundScore, calculateBonusMultiplier, checkBonusConditions } from "./scoring";
import type { PlayerAnswer, AnswerEvaluation } from "@/types/game";

describe("calculateRoundScore", () => {
  it("scores basic round: difficulty × correctCount", () => {
    expect(calculateRoundScore(100, 4, false, 0)).toBe(400);
  });

  it("scores zero when no correct answers", () => {
    expect(calculateRoundScore(100, 0, false, 0)).toBe(0);
  });

  it("doubles with joker", () => {
    expect(calculateRoundScore(100, 4, true, 0)).toBe(800);
  });

  it("applies bonus multiplier", () => {
    expect(calculateRoundScore(100, 4, false, 1.2)).toBe(480);
  });

  it("applies joker + bonus", () => {
    expect(calculateRoundScore(100, 4, true, 1.2)).toBe(960);
  });

  it("handles partial correct (2 out of 4)", () => {
    expect(calculateRoundScore(100, 2, false, 0)).toBe(200);
  });
});

describe("calculateBonusMultiplier", () => {
  it("returns multiplier from remaining time", () => {
    expect(calculateBonusMultiplier(12, 60)).toBeCloseTo(1.2);
  });

  it("returns 0 when no bonus time", () => {
    expect(calculateBonusMultiplier(0, 60)).toBe(0);
  });
});

describe("checkBonusConditions", () => {
  const activeDuration = 60;

  it("grants bonus when all correct, unique, and answered in time", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 1000 },
      Carol: { text: "answer2", timestamp: 2000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: true },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(true);
    expect(result.bonusTime).toBeGreaterThan(0);
  });

  it("denies bonus when not all correct", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 1000 },
      Carol: { text: "wrong", timestamp: 2000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: false },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when answers are merged (not unique)", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "same", timestamp: 1000 },
      Carol: { text: "same", timestamp: 2000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: true },
    ];
    const groups = [["Bob", "Carol"]]; // merged
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when not all responders answered", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 1000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
    ];
    const groups = [["Bob"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when a player gave up (empty text)", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 1000 },
      Carol: { text: "", timestamp: 2000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: false },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(false);
  });
});
