import { describe, it, expect } from "vitest";
import { computeNominations } from "./index";
import type { NominationRule } from "./types";
import type { PlayerData, RoundResult, Topic } from "@/types/game";

const players: PlayerData[] = [
  { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
  { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
];

const topics: Topic[] = [
  { name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: ["a"] }] },
];

function makeHistory(overrides?: Partial<RoundResult>): RoundResult[] {
  return [{
    type: "round",
    teamId: "red",
    captainName: "Alice",
    questionIndex: 0,
    score: 100,
    jokerUsed: false,
    playerResults: [
      { playerName: "Bob", answerText: "answer", correct: true, answerTime: 3000, groupIndex: 0 },
    ],
    difficulty: 100,
    topicIndex: 0,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [["Bob"]],
    ...overrides,
  }];
}

describe("computeNominations", () => {
  it("returns empty array for empty rules", () => {
    const result = computeNominations(makeHistory(), players, topics, []);
    expect(result).toEqual([]);
  });

  it("applies skip tie strategy — no nomination when tied", () => {
    const rule: NominationRule = {
      id: "test",
      emoji: "🧪",
      titleKey: "test.title",
      descriptionKey: "test.desc",
      tieStrategy: "skip",
      compute: () => [
        { playerName: "Alice", value: 10, statLabel: "10" },
        { playerName: "Bob", value: 10, statLabel: "10" },
      ],
    };
    const result = computeNominations(makeHistory(), players, topics, [rule]);
    expect(result).toEqual([]);
  });

  it("applies all tie strategy — all winners", () => {
    const rule: NominationRule = {
      id: "test",
      emoji: "🧪",
      titleKey: "test.title",
      descriptionKey: "test.desc",
      tieStrategy: "all",
      compute: () => [
        { playerName: "Alice", value: 10, statLabel: "10" },
        { playerName: "Bob", value: 10, statLabel: "10" },
      ],
    };
    const result = computeNominations(makeHistory(), players, topics, [rule]);
    expect(result).toHaveLength(1);
    expect(result[0]!.winners).toHaveLength(2);
  });

  it("applies random tie strategy — exactly one winner", () => {
    const rule: NominationRule = {
      id: "test",
      emoji: "🧪",
      titleKey: "test.title",
      descriptionKey: "test.desc",
      tieStrategy: "random",
      compute: () => [
        { playerName: "Alice", value: 10, statLabel: "10" },
        { playerName: "Bob", value: 10, statLabel: "10" },
      ],
    };
    const result = computeNominations(makeHistory(), players, topics, [rule]);
    expect(result).toHaveLength(1);
    expect(result[0]!.winners).toHaveLength(1);
  });

  it("skips nomination when compute returns null", () => {
    const rule: NominationRule = {
      id: "test",
      emoji: "🧪",
      titleKey: "test.title",
      descriptionKey: "test.desc",
      tieStrategy: "skip",
      compute: () => null,
    };
    const result = computeNominations(makeHistory(), players, topics, [rule]);
    expect(result).toEqual([]);
  });

  it("single winner gets nomination with stat", () => {
    const rule: NominationRule = {
      id: "test",
      emoji: "🧪",
      titleKey: "test.title",
      descriptionKey: "test.desc",
      tieStrategy: "skip",
      compute: () => [
        { playerName: "Alice", value: 10, statLabel: "10 pts" },
        { playerName: "Bob", value: 5, statLabel: "5 pts" },
      ],
    };
    const result = computeNominations(makeHistory(), players, topics, [rule]);
    expect(result).toHaveLength(1);
    expect(result[0]!.winners).toHaveLength(1);
    expect(result[0]!.winners[0]!.name).toBe("Alice");
    expect(result[0]!.stat).toBe("10 pts");
  });
});
