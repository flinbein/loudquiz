import { describe, it, expect } from "vitest";
import { stuckRecordRule } from "./stuckRecord";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeCtx(playerResults: RoundResult["playerResults"][]): NominationContext {
  const history: RoundResult[] = playerResults.map((pr, i) => ({
    type: "round" as const,
    teamId: "red" as const,
    captainName: "Captain",
    questionIndex: i,
    score: 100,
    jokerUsed: false,
    playerResults: pr,
    difficulty: 100,
    topicIndex: 0,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [],
  }));
  const players: PlayerData[] = [
    { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
    { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
  ];
  return { history, players, topics: [] };
}

describe("stuckRecordRule", () => {
  it("awards player who repeated an answer the most (with at least one correct)", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "paris", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "london", correct: false, answerTime: 1000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "paris", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "london", correct: false, answerTime: 1000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "paris", correct: false, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "rome", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    // Alice: "paris" x3, has correct instances => qualifies with value 3
    // Bob: "london" x2 but never correct => excluded
    const result = stuckRecordRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(3);
  });

  it("returns null when no repeated answers", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "paris", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "london", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    expect(stuckRecordRule.compute(ctx)).toBeNull();
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(stuckRecordRule.compute(ctx)).toBeNull();
  });

  it("is case insensitive for detecting repeats", () => {
    const ctx = makeCtx([
      [{ playerName: "Alice", answerText: "Paris", correct: true, answerTime: 1000, groupIndex: 0 }],
      [{ playerName: "Alice", answerText: "paris", correct: false, answerTime: 1000, groupIndex: 0 }],
    ]);
    const result = stuckRecordRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(2);
  });
});
