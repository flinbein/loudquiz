import { describe, it, expect } from "vitest";
import { artistRule } from "./artist";
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

describe("artistRule", () => {
  it("counts emoji in answers and ranks by count", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "🎉🎊🎈", correct: true, answerTime: 1000, groupIndex: 0 },
        { playerName: "Bob", answerText: "🎉", correct: false, answerTime: 2000, groupIndex: 0 },
      ],
    ]);
    const result = artistRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(3);
    expect(result![1]!.playerName).toBe("Bob");
    expect(result![1]!.value).toBe(1);
  });

  it("returns null when no emoji in any answer", () => {
    const ctx = makeCtx([
      [
        { playerName: "Alice", answerText: "no emojis here", correct: true, answerTime: 1000, groupIndex: 0 },
      ],
    ]);
    expect(artistRule.compute(ctx)).toBeNull();
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(artistRule.compute(ctx)).toBeNull();
  });
});
