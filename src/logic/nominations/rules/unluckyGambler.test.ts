import { describe, it, expect } from "vitest";
import { unluckyGamblerRule } from "./unluckyGambler";
import type { NominationContext } from "../types";
import type { RoundResult } from "@/types/game";

function makeRound(overrides: Partial<RoundResult> & Pick<RoundResult, "jokerUsed" | "captainName">): RoundResult {
  return {
    type: "round",
    teamId: "red",
    questionIndex: 0,
    score: 100,
    difficulty: 50,
    topicIndex: 0,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    playerResults: [],
    groups: [],
    ...overrides,
  };
}

function makeCtx(rounds: RoundResult[]): NominationContext {
  return { history: rounds, players: [], topics: [] };
}

describe("unluckyGamblerRule", () => {
  it("awards captain when <=50% unique players answered correctly with joker", () => {
    const ctx = makeCtx([
      makeRound({
        captainName: "Bob",
        jokerUsed: true,
        groups: [["Alice"], ["Carol"]],
        playerResults: [
          { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
          { playerName: "Carol", answerText: "c", correct: false, answerTime: 1500, groupIndex: 1 },
        ],
      }),
    ]);
    const result = unluckyGamblerRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Bob");
    expect(result![0]!.statLabel).toBe("1");
  });

  it("returns null when joker was never used", () => {
    const ctx = makeCtx([
      makeRound({
        captainName: "Alice",
        jokerUsed: false,
        groups: [["Bob"]],
        playerResults: [
          { playerName: "Bob", answerText: "b", correct: false, answerTime: 1000, groupIndex: 0 },
        ],
      }),
    ]);
    expect(unluckyGamblerRule.compute(ctx)).toBeNull();
  });

  it("does not award when >50% unique players correct", () => {
    const ctx = makeCtx([
      makeRound({
        captainName: "Alice",
        jokerUsed: true,
        groups: [["Bob"], ["Carol"]],
        playerResults: [
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Carol", answerText: "c", correct: true, answerTime: 1500, groupIndex: 1 },
        ],
      }),
    ]);
    expect(unluckyGamblerRule.compute(ctx)).toBeNull();
  });

  it("awards on exactly 50% correct (boundary case)", () => {
    const ctx = makeCtx([
      makeRound({
        captainName: "Alice",
        jokerUsed: true,
        groups: [["Bob"], ["Carol"]],
        playerResults: [
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Carol", answerText: "c", correct: false, answerTime: 1500, groupIndex: 1 },
        ],
      }),
    ]);
    // 50% = 0.5 <= 0.5, so unluckyGambler awards
    const result = unluckyGamblerRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
  });
});
