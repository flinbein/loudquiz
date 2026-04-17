import { describe, it, expect } from "vitest";
import { brevityRule } from "./brevity";
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

describe("brevityRule", () => {
  it("awards player with shortest correct answers first (lowest total length)", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "hi", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "hello world", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    // Alice: 2 chars, Bob: 11 chars; Alice wins (highest value = -2 vs -11)
    const result = brevityRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(-2);
    expect(result![0]!.statLabel).toBe("2");
  });

  it("returns null when no correct answers", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "wrong", correct: false, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    expect(brevityRule.compute(ctx)).toBeNull();
  });

  it("only counts correct answers", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: false, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    const result = brevityRule.compute(ctx);
    expect(result).not.toBeNull();
    // Bob has no correct answers, should not appear
    expect(result!.find((c) => c.playerName === "Bob")).toBeUndefined();
    expect(result![0]!.playerName).toBe("Alice");
  });
});
