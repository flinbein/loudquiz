import { describe, it, expect } from "vitest";
import { sniperRule } from "./sniper";
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
    { name: "Captain", emoji: "👺", team: "red", online: true, ready: true },
  ];
  return { history, players, topics: [] };
}

describe("sniperRule", () => {
  it("returns player with highest correct rate first", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    // Alice: 2/2 = 100%, Bob: 1/2 = 50%
    const result = sniperRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.statLabel).toBe("100%");
    expect(result![1]!.playerName).toBe("Bob");
    expect(result![1]!.statLabel).toBe("50%");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(sniperRule.compute(ctx)).toBeNull();
  });

  it("skips null (not evaluated) answers", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: null, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    // Alice has no evaluated answers; Bob: 1/1 = 100%
    const result = sniperRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.find((c) => c.playerName === "Alice")).toBeUndefined();
    expect(result![0]!.playerName).toBe("Bob");
  });

  it("returns null when all answers are null", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: null, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    expect(sniperRule.compute(ctx)).toBeNull();
  });
});
