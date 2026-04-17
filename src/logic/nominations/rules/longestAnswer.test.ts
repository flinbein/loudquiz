import { describe, it, expect } from "vitest";
import { longestAnswerRule } from "./longestAnswer";
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

describe("longestAnswerRule", () => {
  it("returns player with highest average non-empty answer length", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "hello world!", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "hi", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    // Alice avg: 12, Bob avg: 2
    const result = longestAnswerRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
  });

  it("ignores empty answers in the average", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "hello", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "", correct: null, answerTime: 0, groupIndex: 0 },
      ],
    ]);
    const result = longestAnswerRule.compute(ctx);
    expect(result).not.toBeNull();
    // Bob has no non-empty answers so should not appear
    expect(result!.find((c) => c.playerName === "Bob")).toBeUndefined();
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(longestAnswerRule.compute(ctx)).toBeNull();
  });
});
