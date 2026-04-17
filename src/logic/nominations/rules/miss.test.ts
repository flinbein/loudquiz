import { describe, it, expect } from "vitest";
import { missRule } from "./miss";
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

describe("missRule", () => {
  it("returns player with lowest correct rate first (highest value)", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    // Alice: 2/2 = 100%, Bob: 0/2 = 0% => Bob is the miss
    const result = missRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Bob");
    expect(result![0]!.statLabel).toBe("0%");
    expect(result![0]!.value).toBe(1); // 1 - 0 = 1
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(missRule.compute(ctx)).toBeNull();
  });

  it("uses display statLabel as the actual rate, not the inverted value", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    // Alice: 1/2 = 50%, Bob: 2/2 = 100% => Alice is the miss
    const result = missRule.compute(ctx);
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.statLabel).toBe("50%");
  });
});
