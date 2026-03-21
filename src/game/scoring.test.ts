import { describe, it, expect } from "vitest";
import {
  normalizeAnswer,
  computeChainLength,
  computeBlitzScore,
  calculateRoundScore,
  balanceQuestions,
} from "./scoring";
import type { Question, AnswerGroup } from "./types";

describe("normalizeAnswer", () => {
  it("lowercases", () => {
    expect(normalizeAnswer("Труба")).toBe("труба");
  });
  it("replaces ё with е", () => {
    expect(normalizeAnswer("Ёжик")).toBe("ежик");
    expect(normalizeAnswer("ЁЛКА")).toBe("елка");
  });
  it("trims whitespace", () => {
    expect(normalizeAnswer("  яблоко  ")).toBe("яблоко");
  });
});

describe("computeChainLength", () => {
  it("counts consecutive correct answers from start", () => {
    const answers = { p1: "Мандарин", p2: "мандарин", p3: "Апельсин", p4: "Мандарин" };
    expect(computeChainLength(["p1", "p2", "p3", "p4"], answers, "Мандарин")).toBe(2);
  });
  it("returns 0 if first answer is wrong", () => {
    const answers = { p1: "Апельсин", p2: "Мандарин" };
    expect(computeChainLength(["p1", "p2"], answers, "Мандарин")).toBe(0);
  });
  it("handles ё normalization", () => {
    const answers = { p1: "ёжик" };
    expect(computeChainLength(["p1"], answers, "Ежик")).toBe(1);
  });
  it("empty order returns 0", () => {
    expect(computeChainLength([], {}, "Мандарин")).toBe(0);
  });
});

describe("computeBlitzScore", () => {
  it("returns chain * cost when timer ran out", () => {
    expect(computeBlitzScore(2, 200, false, 5000, 120000)).toBe(400);
  });
  it("adds bonus when all answered early", () => {
    const score = computeBlitzScore(2, 200, true, 5000, 120000);
    expect(score).toBe(Math.round(400 * (1 + 5000 / 120000)));
  });
  it("returns 0 for 0 chain", () => {
    expect(computeBlitzScore(0, 200, true, 60000, 120000)).toBe(0);
  });
});

describe("calculateRoundScore", () => {
  const makeGroup = (accepted: boolean): AnswerGroup => ({
    id: "g1",
    accepted,
    canonicalAnswer: "test",
    playerIds: ["p1"],
  });
  it("multiplies difficulty by accepted count", () => {
    expect(
      calculateRoundScore(150, [makeGroup(true), makeGroup(true), makeGroup(false)], false),
    ).toBe(300);
  });
  it("doubles score with joker when score > 0", () => {
    expect(calculateRoundScore(150, [makeGroup(true)], true)).toBe(300);
  });
  it("joker does not double 0 score", () => {
    expect(calculateRoundScore(150, [makeGroup(false)], true)).toBe(0);
  });
});

describe("balanceQuestions", () => {
  const makeQ = (id: string): Question => ({ id, text: "q", difficulty: 100 });

  it("does nothing for 1 team", () => {
    const table = [[makeQ("a"), makeQ("b"), makeQ("c")]];
    expect(balanceQuestions(table, 1)[0]).toHaveLength(3);
  });
  it("keeps even total unchanged for 2 teams", () => {
    const table = [
      [makeQ("a"), makeQ("b")],
      [makeQ("c"), makeQ("d")],
    ];
    const result = balanceQuestions(table, 2);
    const total = result.reduce((s, t) => s + t.length, 0);
    expect(total).toBe(4);
  });
  it("removes last question when total is odd for 2 teams", () => {
    const table = [[makeQ("a"), makeQ("b"), makeQ("c")]];
    const result = balanceQuestions(table, 2);
    const total = result.reduce((s, t) => s + t.length, 0);
    expect(total).toBe(2);
  });
});
