import { describe, it, expect } from "vitest";
import { captainFailRule } from "./captainFail";
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

describe("captainFailRule", () => {
  it("returns captain with lowest total score first", () => {
    const ctx = makeCtx([
      { captainName: "Alice", score: 200 },
      { captainName: "Bob", score: 50 },
      { captainName: "Alice", score: 150 },
    ]);
    const result = captainFailRule.compute(ctx);
    expect(result).not.toBeNull();
    // Bob has 50, Alice has 350 — Bob wins (lowest score)
    expect(result![0]!.playerName).toBe("Bob");
    expect(result![0]!.statLabel).toBe("50");
    expect(result![1]!.playerName).toBe("Alice");
    expect(result![1]!.statLabel).toBe("350");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(captainFailRule.compute(ctx)).toBeNull();
  });

  it("value is negative of total score", () => {
    const ctx = makeCtx([{ captainName: "Alice", score: 100 }]);
    const result = captainFailRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.value).toBe(-100);
  });
});
