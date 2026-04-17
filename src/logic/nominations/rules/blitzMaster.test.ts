import { describe, it, expect } from "vitest";
import { blitzMasterRule } from "./blitzMaster";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData } from "@/types/game";

function makeBlitzRound(captainName: string, score: number, index = 0): RoundResult {
  return {
    type: "blitz" as const,
    teamId: "red" as const,
    captainName,
    questionIndex: index,
    score,
    jokerUsed: false,
    playerResults: [],
    difficulty: 100,
    topicIndex: -1,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [],
  };
}

function makeNormalRound(captainName: string, score: number, index = 0): RoundResult {
  return {
    type: "round" as const,
    teamId: "red" as const,
    captainName,
    questionIndex: index,
    score,
    jokerUsed: false,
    playerResults: [],
    difficulty: 100,
    topicIndex: 0,
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

describe("blitzMasterRule", () => {
  it("returns captain with highest total blitz score", () => {
    const ctx = makeCtx([
      makeBlitzRound("Alice", 300, 0),
      makeBlitzRound("Bob", 100, 1),
      makeBlitzRound("Alice", 200, 2),
    ]);
    const result = blitzMasterRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(500);
  });

  it("returns null when no blitz rounds", () => {
    const ctx = makeCtx([makeNormalRound("Alice", 100, 0)]);
    expect(blitzMasterRule.compute(ctx)).toBeNull();
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(blitzMasterRule.compute(ctx)).toBeNull();
  });
});
