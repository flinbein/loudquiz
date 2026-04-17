import { describe, it, expect } from "vitest";
import { robotRule } from "./robot";
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

describe("robotRule", () => {
  it("counts binary-only answers per player", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "101010", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "hello", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "0011", correct: false, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "11", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    const result = robotRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(2);
    expect(result![1]!.playerName).toBe("Bob");
    expect(result![1]!.value).toBe(1);
  });

  it("requires at least 2 characters", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "1", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "01", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    const result = robotRule.compute(ctx);
    expect(result).not.toBeNull();
    // "1" is only 1 char, doesn't match {2,}
    expect(result!.find((c) => c.playerName === "Alice")).toBeUndefined();
    expect(result![0]!.playerName).toBe("Bob");
  });

  it("returns null when no binary answers", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "hello", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    expect(robotRule.compute(ctx)).toBeNull();
  });
});
