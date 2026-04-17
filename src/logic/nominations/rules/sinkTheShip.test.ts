import { describe, it, expect } from "vitest";
import { sinkTheShipRule } from "./sinkTheShip";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeRound(playerResults: RoundResult["playerResults"]): RoundResult {
  return {
    type: "round" as const,
    teamId: "red" as const,
    captainName: "Captain",
    questionIndex: 0,
    score: 100,
    jokerUsed: false,
    playerResults,
    difficulty: 100,
    topicIndex: 0,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [],
  };
}

const players: PlayerData[] = [
  { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
  { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
  { name: "Charlie", emoji: "😺", team: "red", online: true, ready: true },
];

describe("sinkTheShipRule", () => {
  it("returns player who was the sole incorrect answer most times", () => {
    const ctx: NominationContext = {
      history: [
        makeRound([
          { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
          { playerName: "Charlie", answerText: "c", correct: true, answerTime: 3000, groupIndex: 0 },
        ]),
        makeRound([
          { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
          { playerName: "Charlie", answerText: "c", correct: true, answerTime: 3000, groupIndex: 0 },
        ]),
        makeRound([
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: false, answerTime: 2000, groupIndex: 0 },
          { playerName: "Charlie", answerText: "c", correct: true, answerTime: 3000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    // Alice sank ship 2x, Bob 1x
    const result = sinkTheShipRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(2);
    expect(result![0]!.statLabel).toBe("2");
  });

  it("does not count rounds with 2+ incorrect players", () => {
    const ctx: NominationContext = {
      history: [
        makeRound([
          { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: false, answerTime: 2000, groupIndex: 0 },
          { playerName: "Charlie", answerText: "c", correct: true, answerTime: 3000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    expect(sinkTheShipRule.compute(ctx)).toBeNull();
  });

  it("requires at least 2 evaluated players per round", () => {
    const ctx: NominationContext = {
      history: [
        makeRound([
          { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    expect(sinkTheShipRule.compute(ctx)).toBeNull();
  });

  it("returns null when history is empty", () => {
    const ctx: NominationContext = {
      history: [],
      players,
      topics: [],
    };
    expect(sinkTheShipRule.compute(ctx)).toBeNull();
  });

  it("skips rounds with null evaluations", () => {
    const ctx: NominationContext = {
      history: [
        makeRound([
          { playerName: "Alice", answerText: "a", correct: null, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    // Only 1 evaluated player (Bob) — not enough
    expect(sinkTheShipRule.compute(ctx)).toBeNull();
  });
});
