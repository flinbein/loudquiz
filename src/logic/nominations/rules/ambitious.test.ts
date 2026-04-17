import { describe, it, expect } from "vitest";
import { ambitiousRule } from "./ambitious";
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

describe("ambitiousRule", () => {
  it("returns captain with highest average difficulty", () => {
    const ctx = makeCtx([
      { captainName: "Alice", difficulty: 80, type: "round" },
      { captainName: "Alice", difficulty: 100, type: "round" },
      { captainName: "Bob", difficulty: 40, type: "round" },
    ]);
    const result = ambitiousRule.compute(ctx);
    expect(result).not.toBeNull();
    // Alice avg = 90, Bob avg = 40
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.statLabel).toBe("90");
    expect(result![1]!.playerName).toBe("Bob");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(ambitiousRule.compute(ctx)).toBeNull();
  });

  it("ignores blitz rounds", () => {
    const ctx = makeCtx([
      { captainName: "Alice", difficulty: 90, type: "round" },
      { captainName: "Bob", difficulty: 200, type: "blitz" },
    ]);
    const result = ambitiousRule.compute(ctx);
    expect(result).not.toBeNull();
    // Only round type is counted; Bob's blitz should be ignored
    expect(result!.find((c) => c.playerName === "Bob")).toBeUndefined();
    expect(result![0]!.playerName).toBe("Alice");
  });
});
