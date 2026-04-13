import { describe, it, expect } from "vitest";
import { canBeCaptain, getEligibleCaptains, getRandomCaptain } from "./captain";
import type { PlayerData, RoundResult } from "@/types/game";

const players: PlayerData[] = [
  { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
  { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
  { name: "Carol", emoji: "👺", team: "red", online: true, ready: true },
];

function makeResult(captainName: string): RoundResult {
  return { type: "round", teamId: "red", captainName, score: 0, jokerUsed: false };
}

describe("canBeCaptain", () => {
  it("allows anyone when no history", () => {
    expect(canBeCaptain("Alice", [])).toBe(true);
  });

  it("forbids consecutive captaining", () => {
    const history = [makeResult("Alice")];
    expect(canBeCaptain("Alice", history)).toBe(false);
  });

  it("allows alternation A-B-A", () => {
    const history = [makeResult("Alice"), makeResult("Bob")];
    expect(canBeCaptain("Alice", history)).toBe(true);
  });

  it("allows when last round was a different player", () => {
    const history = [makeResult("Bob")];
    expect(canBeCaptain("Alice", history)).toBe(true);
  });
});

describe("getEligibleCaptains", () => {
  it("excludes last captain", () => {
    const history = [makeResult("Alice")];
    const eligible = getEligibleCaptains(players, history);
    expect(eligible.map((p) => p.name)).toEqual(["Bob", "Carol"]);
  });

  it("returns all when no history", () => {
    const eligible = getEligibleCaptains(players, []);
    expect(eligible).toHaveLength(3);
  });

  it("returns all if everyone was last captain (edge case with 1 player)", () => {
    const single = [players[0]!];
    const history = [makeResult("Alice")];
    const eligible = getEligibleCaptains(single, history);
    expect(eligible).toHaveLength(1);
  });
});

describe("getRandomCaptain", () => {
  it("returns one of the eligible players", () => {
    const history = [makeResult("Alice")];
    const captain = getRandomCaptain(players, history);
    expect(["Bob", "Carol"]).toContain(captain);
  });

  it("returns the only player when team size is 1", () => {
    const single = [players[0]!];
    const captain = getRandomCaptain(single, [makeResult("Alice")]);
    expect(captain).toBe("Alice");
  });
});
