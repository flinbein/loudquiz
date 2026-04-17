import { describe, it, expect } from "vitest";
import { narrowSpecialistRule } from "./narrowSpecialist";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeRound(
  playerResults: RoundResult["playerResults"],
  topicIndex: number,
  difficulty = 100,
  index = 0
): RoundResult {
  return {
    type: "round" as const,
    teamId: "red" as const,
    captainName: "Captain",
    questionIndex: index,
    score: 100,
    jokerUsed: false,
    playerResults,
    difficulty,
    topicIndex,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [],
  };
}

function makeCtx(history: RoundResult[]): NominationContext {
  const players: PlayerData[] = [
    { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
    { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
  ];
  return { history, players, topics: [] };
}

describe("narrowSpecialistRule", () => {
  it("awards player with correct answers in exactly one topic when 2+ topics exist", () => {
    const ctx = makeCtx([
      makeRound(
        [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 1000, groupIndex: 0 },
        ],
        0,
        100,
        0
      ),
      makeRound(
        [
          { playerName: "Alice", answerText: "a2", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b2", correct: false, answerTime: 1000, groupIndex: 0 },
        ],
        1,
        200,
        1
      ),
    ]);
    const result = narrowSpecialistRule.compute(ctx);
    expect(result).not.toBeNull();
    // Bob had correct only in topic 0 (1 topic), Alice had correct in both topics (excluded)
    expect(result![0]!.playerName).toBe("Bob");
  });

  it("returns null when only one topic exists", () => {
    const ctx = makeCtx([
      makeRound(
        [{ playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 }],
        0
      ),
    ]);
    expect(narrowSpecialistRule.compute(ctx)).toBeNull();
  });

  it("returns null when no correct answers", () => {
    const ctx = makeCtx([
      makeRound(
        [{ playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 }],
        0
      ),
      makeRound(
        [{ playerName: "Bob", answerText: "b", correct: false, answerTime: 1000, groupIndex: 0 }],
        1
      ),
    ]);
    expect(narrowSpecialistRule.compute(ctx)).toBeNull();
  });
});
