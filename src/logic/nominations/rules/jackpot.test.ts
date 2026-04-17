import { describe, it, expect } from "vitest";
import { jackpotRule } from "./jackpot";
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

describe("jackpotRule", () => {
  it("returns captain of the round with highest score", () => {
    const ctx = makeCtx([
      { captainName: "Alice", score: 100 },
      { captainName: "Bob", score: 500 },
      { captainName: "Carol", score: 200 },
    ]);
    const result = jackpotRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0]!.playerName).toBe("Bob");
    expect(result![0]!.statLabel).toBe("500");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(jackpotRule.compute(ctx)).toBeNull();
  });

  it("returns multiple captains when tied for highest score", () => {
    const ctx = makeCtx([
      { captainName: "Alice", score: 300 },
      { captainName: "Bob", score: 300 },
      { captainName: "Carol", score: 100 },
    ]);
    const result = jackpotRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(2);
    const names = result!.map((c) => c.playerName);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
  });

  it("deduplicates captain when they have multiple top-score rounds", () => {
    const ctx = makeCtx([
      { captainName: "Alice", score: 400 },
      { captainName: "Alice", score: 400 },
    ]);
    const result = jackpotRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.value).toBe(400);
  });
});
