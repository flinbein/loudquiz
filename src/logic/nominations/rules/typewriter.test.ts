import { describe, it, expect } from "vitest";
import { typewriterRule } from "./typewriter";
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

describe("typewriterRule", () => {
  it("returns player with highest total character count", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "hello world", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "hi", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "", correct: null, answerTime: 0, groupIndex: 0 },
        { playerName: "Bob", answerText: "test", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    // Alice: 11 + 0 = 11, Bob: 2 + 4 = 6
    const result = typewriterRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(11);
  });

  it("includes empty answers in the total", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "", correct: null, answerTime: 0, groupIndex: 0 },
        { playerName: "Bob", answerText: "ab", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    const result = typewriterRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.find((c) => c.playerName === "Alice")?.value).toBe(0);
    expect(result![0]!.playerName).toBe("Bob");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(typewriterRule.compute(ctx)).toBeNull();
  });
});
