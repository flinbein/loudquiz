import { describe, it, expect } from "vitest";
import { goldMineRule } from "./goldMine";
import type { NominationContext } from "../types";
import type { RoundResult } from "@/types/game";

function makeCtx(rounds: Partial<RoundResult>[]): NominationContext {
  const history: RoundResult[] = rounds.map((r, i) => ({
    type: "round" as const,
    teamId: "red" as const,
    captainName: r.captainName ?? "Alice",
    questionIndex: i,
    score: r.score ?? 100,
    jokerUsed: false,
    playerResults: [],
    difficulty: 100,
    topicIndex: 0,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [],
    ...r,
  }));
  return { history, players: [], topics: [] };
}

describe("goldMineRule", () => {
  it("returns captain with highest total score first", () => {
    const ctx = makeCtx([
      { captainName: "Alice", score: 500 },
      { captainName: "Bob", score: 200 },
      { captainName: "Alice", score: 300 },
    ]);
    const result = goldMineRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.statLabel).toBe("800");
    expect(result![1]!.playerName).toBe("Bob");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(goldMineRule.compute(ctx)).toBeNull();
  });

  it("sums scores from all rounds where player was captain", () => {
    const ctx = makeCtx([
      { captainName: "Carol", score: 100 },
      { captainName: "Carol", score: 200 },
      { captainName: "Carol", score: 300 },
    ]);
    const result = goldMineRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.value).toBe(600);
    expect(result![0]!.statLabel).toBe("600");
  });
});
