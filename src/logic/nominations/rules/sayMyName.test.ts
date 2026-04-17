import { describe, it, expect } from "vitest";
import { sayMyNameRule } from "./sayMyName";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeCtx(
  playerResults: RoundResult["playerResults"][],
  players: PlayerData[]
): NominationContext {
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
  return { history, players, topics: [] };
}

describe("sayMyNameRule", () => {
  const players: PlayerData[] = [
    { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
    { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
  ];

  it("counts mentions of other players' names in answers", () => {
    const ctx = makeCtx(
      [
        [
          { playerName: "Alice", answerText: "I think bob did it", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "plain answer", correct: false, answerTime: 2000, groupIndex: 0 },
        ],
      ],
      players
    );
    const result = sayMyNameRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(1);
  });

  it("returns null when no player names are mentioned", () => {
    const ctx = makeCtx(
      [
        [
          { playerName: "Alice", answerText: "hello world", correct: true, answerTime: 1000, groupIndex: 0 },
        ],
      ],
      players
    );
    expect(sayMyNameRule.compute(ctx)).toBeNull();
  });

  it("is case insensitive", () => {
    const ctx = makeCtx(
      [
        [
          { playerName: "Bob", answerText: "ALICE did this", correct: true, answerTime: 1000, groupIndex: 0 },
        ],
      ],
      players
    );
    const result = sayMyNameRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Bob");
  });
});
