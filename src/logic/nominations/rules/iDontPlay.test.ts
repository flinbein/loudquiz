import { describe, it, expect } from "vitest";
import { iDontPlayRule } from "./iDontPlay";
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

describe("iDontPlayRule", () => {
  it("returns player with most empty answers first", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "", correct: null, answerTime: 0, groupIndex: 0 },
        { playerName: "Bob", answerText: "answer", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "", correct: null, answerTime: 0, groupIndex: 0 },
        { playerName: "Bob", answerText: "", correct: null, answerTime: 0, groupIndex: 0 },
      ],
    ]);
    const result = iDontPlayRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(2);
    expect(result![1]!.playerName).toBe("Bob");
    expect(result![1]!.value).toBe(1);
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(iDontPlayRule.compute(ctx)).toBeNull();
  });

  it("returns null when no player has empty answers", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "hello", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "world", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    expect(iDontPlayRule.compute(ctx)).toBeNull();
  });
});
