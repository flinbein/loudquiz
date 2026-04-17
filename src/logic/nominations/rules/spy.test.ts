import { describe, it, expect } from "vitest";
import { spyRule } from "./spy";
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

describe("spyRule", () => {
  it("counts answers with no letters or digits (length > 3)", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "!@#$%", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "hello", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
      [
        { playerName: "Alice", answerText: "----", correct: false, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "???!", correct: true, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    const result = spyRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(2);
    expect(result![1]!.playerName).toBe("Bob");
    expect(result![1]!.value).toBe(1);
  });

  it("requires length > 3", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "!!!!", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "!!!", correct: false, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    const result = spyRule.compute(ctx);
    expect(result).not.toBeNull();
    // "!!!!" has length 4 (>3), "!!!" has length 3 (not >3)
    expect(result!.find((c) => c.playerName === "Bob")).toBeUndefined();
    expect(result![0]!.playerName).toBe("Alice");
  });

  it("returns null when no matching answers", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "hello world", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    expect(spyRule.compute(ctx)).toBeNull();
  });
});
