import { describe, it, expect } from "vitest";
import { cautiousRule } from "./cautious";
import type { NominationContext } from "../types";
import type { RoundResult } from "@/types/game";

function makeCtx(rounds: Partial<RoundResult>[]): NominationContext {
  const history: RoundResult[] = rounds.map((r, i) => ({
    type: (r.type ?? "round") as "round" | "blitz",
    teamId: "red" as const,
    captainName: r.captainName ?? "Alice",
    questionIndex: i,
    score: 100,
    jokerUsed: false,
    playerResults: [],
    difficulty: r.difficulty ?? 50,
    topicIndex: 0,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [],
    ...r,
  }));
  return { history, players: [], topics: [] };
}

describe("cautiousRule", () => {
  it("returns captain with lowest average difficulty first", () => {
    const ctx = makeCtx([
      { captainName: "Alice", difficulty: 80, type: "round" },
      { captainName: "Bob", difficulty: 20, type: "round" },
      { captainName: "Bob", difficulty: 40, type: "round" },
    ]);
    const result = cautiousRule.compute(ctx);
    expect(result).not.toBeNull();
    // Bob avg = 30, Alice avg = 80 — Bob wins (lowest)
    expect(result![0]!.playerName).toBe("Bob");
    expect(result![0]!.statLabel).toBe("30");
    expect(result![1]!.playerName).toBe("Alice");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(cautiousRule.compute(ctx)).toBeNull();
  });

  it("value is negative of avg difficulty", () => {
    const ctx = makeCtx([{ captainName: "Alice", difficulty: 60, type: "round" }]);
    const result = cautiousRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.value).toBe(-60);
  });
});
