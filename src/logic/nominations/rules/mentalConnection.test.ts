import { describe, it, expect } from "vitest";
import { mentalConnectionRule } from "./mentalConnection";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeRound(
  playerResults: RoundResult["playerResults"],
  groups: string[][],
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
    difficulty: 100,
    topicIndex: 0,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups,
  };
}

function makeCtx(history: RoundResult[]): NominationContext {
  const players: PlayerData[] = [
    { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
    { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
  ];
  return { history, players, topics: [] };
}

describe("mentalConnectionRule", () => {
  it("counts correct answers in groups of size >= 2", () => {
    const ctx = makeCtx([
      makeRound(
        [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: true, answerTime: 1000, groupIndex: 0 },
        ],
        [["Alice", "Bob"]], // group of 2
        0
      ),
      makeRound(
        [
          { playerName: "Alice", answerText: "a2", correct: true, answerTime: 1000, groupIndex: 0 },
        ],
        [["Alice"]], // group of 1 — does not count
        1
      ),
    ]);
    const result = mentalConnectionRule.compute(ctx);
    expect(result).not.toBeNull();
    // Alice: 1 (from round 0, group size 2), Bob: 1 (from round 0)
    const alice = result!.find((c) => c.playerName === "Alice");
    const bob = result!.find((c) => c.playerName === "Bob");
    expect(alice?.value).toBe(1);
    expect(bob?.value).toBe(1);
  });

  it("returns null when no correct answers in large groups", () => {
    const ctx = makeCtx([
      makeRound(
        [
          { playerName: "Alice", answerText: "a", correct: false, answerTime: 1000, groupIndex: 0 },
          { playerName: "Bob", answerText: "b", correct: false, answerTime: 1000, groupIndex: 0 },
        ],
        [["Alice", "Bob"]],
        0
      ),
    ]);
    expect(mentalConnectionRule.compute(ctx)).toBeNull();
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(mentalConnectionRule.compute(ctx)).toBeNull();
  });
});
