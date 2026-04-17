import { describe, it, expect } from "vitest";
import { captainObviousRule } from "./captainObvious";
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

describe("captainObviousRule", () => {
  it("returns captain with highest total score first", () => {
    const ctx = makeCtx([
      { captainName: "Alice", score: 200 },
      { captainName: "Bob", score: 100 },
      { captainName: "Alice", score: 150 },
    ]);
    const result = captainObviousRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.statLabel).toBe("350");
    expect(result![1]!.playerName).toBe("Bob");
    expect(result![1]!.statLabel).toBe("100");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(captainObviousRule.compute(ctx)).toBeNull();
  });

  it("handles single captain correctly", () => {
    const ctx = makeCtx([
      { captainName: "Alice", score: 300 },
      { captainName: "Alice", score: 50 },
    ]);
    const result = captainObviousRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.statLabel).toBe("350");
  });
});
