import { describe, it, expect } from "vitest";
import { eruditeRule } from "./erudite";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeRound(
  topicIndex: number,
  playerResults: RoundResult["playerResults"],
  type: "round" | "blitz" = "round",
): RoundResult {
  return {
    type,
    teamId: "red" as const,
    captainName: "Captain",
    questionIndex: 0,
    score: 100,
    jokerUsed: false,
    playerResults,
    difficulty: 100,
    topicIndex,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [],
  };
}

const players: PlayerData[] = [
  { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
  { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
];

describe("eruditeRule", () => {
  it("counts distinct topics where player had at least one correct answer", () => {
    const ctx: NominationContext = {
      history: [
        makeRound(0, [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: false, answerTime: 2000, groupIndex: 0 },
        ]),
        makeRound(1, [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
        ]),
        makeRound(2, [
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    // Alice: topics 0,1 = 2; Bob: topics 1,2 = 2 ... actually Alice=2 Bob=2 tie
    const result = eruditeRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.value).toBe(2);
  });

  it("does not count the same topic twice", () => {
    const ctx: NominationContext = {
      history: [
        makeRound(0, [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        ]),
        makeRound(0, [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    const result = eruditeRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.value).toBe(1);
    expect(result![0]!.statLabel).toBe("1");
  });

  it("skips blitz rounds (topicIndex = -1)", () => {
    const ctx: NominationContext = {
      history: [
        makeRound(-1, [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
        ], "blitz"),
      ],
      players,
      topics: [],
    };
    expect(eruditeRule.compute(ctx)).toBeNull();
  });

  it("returns null when no player has any correct answers", () => {
    const ctx: NominationContext = {
      history: [
        makeRound(0, [
          { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    expect(eruditeRule.compute(ctx)).toBeNull();
  });
});
