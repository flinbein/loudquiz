import { describe, it, expect } from "vitest";
import { philosopherRule } from "./philosopher";
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

describe("philosopherRule", () => {
  it("returns slowest player (highest avg answerTime) first", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 12500, groupIndex: 0 },
      ],
    ]);
    const result = philosopherRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Bob");
    expect(result![0]!.statLabel).toBe("12.5s");
    expect(result![0]!.value).toBe(12500);
  });

  it("excludes captain", () => {
    const ctx = makeCtx([
      [
        { playerName: "Captain", answerText: "slow", correct: true, answerTime: 99000, groupIndex: 0 },
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 5000, groupIndex: 0 },
      ],
    ]);
    const result = philosopherRule.compute(ctx);
    expect(result!.find((c) => c.playerName === "Captain")).toBeUndefined();
  });

  it("returns null when no eligible answers", () => {
    const ctx = makeCtx([]);
    expect(philosopherRule.compute(ctx)).toBeNull();
  });

  it("excludes empty answerText", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "", correct: null, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    expect(philosopherRule.compute(ctx)).toBeNull();
  });
});
