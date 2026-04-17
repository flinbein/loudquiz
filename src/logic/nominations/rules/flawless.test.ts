import { describe, it, expect } from "vitest";
import { flawlessRule } from "./flawless";
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

describe("flawlessRule", () => {
  it("returns all players with 100% correct rate", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    const result = flawlessRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    expect(result!.every((c) => c.value === 1)).toBe(true);
    expect(result!.every((c) => c.statLabel === "100%")).toBe(true);
  });

  it("returns null when no player has 100%", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
      [
        { playerName: "Bob", answerText: "b", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    expect(flawlessRule.compute(ctx)).toBeNull();
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(flawlessRule.compute(ctx)).toBeNull();
  });

  it("excludes players who only have null evaluations", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: null, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    const result = flawlessRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0]!.playerName).toBe("Bob");
  });
});
