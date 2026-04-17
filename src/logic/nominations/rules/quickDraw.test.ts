import { describe, it, expect } from "vitest";
import { quickDrawRule } from "./quickDraw";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeCtx(playerResults: RoundResult["playerResults"][], captainName = "Captain"): NominationContext {
  const history: RoundResult[] = playerResults.map((pr, i) => ({
    type: "round" as const,
    teamId: "red" as const,
    captainName,
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
    { name: "Captain", emoji: "👺", team: "red", online: true, ready: true },
  ];
  return { history, players, topics: [] };
}

describe("quickDrawRule", () => {
  it("returns fastest player (lowest avg answerTime) first", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 5000, groupIndex: 0 },
      ],
    ]);
    const result = quickDrawRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.statLabel).toBe("1.0s");
    expect(result![0]!.value).toBe(-1000);
  });

  it("excludes captain from consideration", () => {
    const ctx = makeCtx([
      [
        { playerName: "Captain", answerText: "a", correct: true, answerTime: 100, groupIndex: 0 },
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    const result = quickDrawRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.find((c) => c.playerName === "Captain")).toBeUndefined();
    expect(result![0]!.playerName).toBe("Alice");
  });

  it("excludes empty answerText and Infinity answerTime", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "", correct: null, answerTime: 500, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: Infinity, groupIndex: 0 },
      ],
    ]);
    expect(quickDrawRule.compute(ctx)).toBeNull();
  });

  it("returns null when no eligible answers", () => {
    const ctx = makeCtx([]);
    expect(quickDrawRule.compute(ctx)).toBeNull();
  });

  it("averages across multiple rounds", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 3000, groupIndex: 0 },
      ],
    ]);
    const result = quickDrawRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.statLabel).toBe("2.0s"); // avg of 1000+3000 = 2000ms = 2.0s
  });
});
