import { describe, it, expect } from "vitest";
import { eternalCaptainRule } from "./eternalCaptain";
import type { NominationContext } from "../types";
import type { RoundResult } from "@/types/game";

function makeCtx(rounds: Partial<RoundResult>[]): NominationContext {
  const history: RoundResult[] = rounds.map((r, i) => ({
    type: "round" as const,
    teamId: "red" as const,
    captainName: r.captainName ?? "Alice",
    questionIndex: i,
    score: 100,
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

describe("eternalCaptainRule", () => {
  it("returns player who was captain most times", () => {
    const ctx = makeCtx([
      { captainName: "Alice" },
      { captainName: "Alice" },
      { captainName: "Bob" },
    ]);
    const result = eternalCaptainRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
    expect(result![0]!.statLabel).toBe("2");
    expect(result![1]!.playerName).toBe("Bob");
    expect(result![1]!.statLabel).toBe("1");
  });

  it("returns null when history is empty", () => {
    const ctx = makeCtx([]);
    expect(eternalCaptainRule.compute(ctx)).toBeNull();
  });

  it("counts each round captain appearance", () => {
    const ctx = makeCtx([
      { captainName: "Carol" },
      { captainName: "Carol" },
      { captainName: "Carol" },
    ]);
    const result = eternalCaptainRule.compute(ctx);
    expect(result).not.toBeNull();
    expect(result!.length).toBe(1);
    expect(result![0]!.value).toBe(3);
  });
});
