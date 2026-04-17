import { describe, it, expect } from "vitest";
import { captainsDaughterRule } from "./captainsDaughter";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeRound(
  captainName: string,
  playerResults: RoundResult["playerResults"],
): RoundResult {
  return {
    type: "round" as const,
    teamId: "red" as const,
    captainName,
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
  { name: "Captain", emoji: "👺", team: "red", online: true, ready: true },
];

describe("captainsDaughterRule", () => {
  it("returns player who was fastest most often", () => {
    const ctx: NominationContext = {
      history: [
        makeRound("Captain", [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 5000, groupIndex: 0 },
        ]),
        makeRound("Captain", [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1500, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 3000, groupIndex: 0 },
        ]),
        makeRound("Captain", [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 4000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 2000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    // Alice fastest rounds 0,1; Bob fastest round 2 => Alice wins
    const result = captainsDaughterRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(2);
    expect(result![0]!.statLabel).toBe("2");
  });

  it("excludes captain from fastest computation", () => {
    const ctx: NominationContext = {
      history: [
        makeRound("Captain", [
          { playerName: "Captain", answerText: "c", correct: true, answerTime: 100, groupIndex: 0 },
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 2000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    const result = captainsDaughterRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
  });

  it("returns null when no eligible rounds", () => {
    const ctx: NominationContext = {
      history: [
        makeRound("Captain", [
          { playerName: "Alice", answerText: "", correct: null, answerTime: Infinity, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    expect(captainsDaughterRule.compute(ctx)).toBeNull();
  });

  it("does not credit a round with tied fastest times", () => {
    const ctx: NominationContext = {
      history: [
        makeRound("Captain", [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 1000, groupIndex: 0 },
        ]),
      ],
      players,
      topics: [],
    };
    // Tie — no one gets credit
    expect(captainsDaughterRule.compute(ctx)).toBeNull();
  });
});
