import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";
import {
  claimBlitzCaptain,
  claimBlitzSlot,
  selectBlitzItem,
  setBlitzPlayerReady,
  submitBlitzAnswer,
  skipBlitzAnswer,
  confirmBlitzReview,
  handleBlitzTimerExpire,
  getNextBlitzAnswerer,
} from "./blitz";
import type { GameState } from "@/types/game";

function setupBlitzState(overrides?: Partial<GameState>) {
  useGameStore.setState({
    phase: "blitz-captain",
    settings: {
      mode: "manual",
      teamMode: "single",
      topicCount: 0,
      questionsPerTopic: 0,
      blitzRoundsPerTeam: 2,
      pastQuestions: [],
    },
    players: [
      { name: "Alice", emoji: "😈", team: "red", online: true, ready: false },
      { name: "Bob", emoji: "👹", team: "red", online: true, ready: false },
      { name: "Carol", emoji: "👺", team: "red", online: true, ready: false },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }],
    topics: [],
    blitzTasks: [
      {
        items: [
          { text: "Коза", difficulty: 200 },
          { text: "Крем-брюле", difficulty: 300 },
        ],
      },
      {
        items: [{ text: "Мост", difficulty: 250 }],
      },
    ],
    currentRound: {
      type: "blitz",
      teamId: "red",
      captainName: "",
      blitzTaskIndex: 0,
      jokerActive: false,
      answers: {},
      playerOrder: [],
      activeTimerStartedAt: 0,
      bonusTime: 0,
    },
    history: [],
    timer: null,
    ...overrides,
  });
}

describe("claimBlitzCaptain", () => {
  beforeEach(() => setupBlitzState());

  it("sets captain and puts them first in playerOrder", () => {
    claimBlitzCaptain("Alice");
    const round = useGameStore.getState().currentRound!;
    expect(round.captainName).toBe("Alice");
    expect(round.playerOrder).toEqual(["Alice"]);
  });

  it("is a no-op when captain already claimed", () => {
    claimBlitzCaptain("Alice");
    claimBlitzCaptain("Bob");
    expect(useGameStore.getState().currentRound!.captainName).toBe("Alice");
  });

  it("rejects consecutive captain", () => {
    setupBlitzState({
      history: [{ type: "blitz", teamId: "red", captainName: "Alice", blitzTaskIndex: 10, score: 100, jokerUsed: false }],
    });
    claimBlitzCaptain("Alice");
    expect(useGameStore.getState().currentRound!.captainName).toBe("");
  });
});

describe("claimBlitzSlot", () => {
  beforeEach(() => {
    setupBlitzState();
    claimBlitzCaptain("Alice");
  });

  it("assigns slot 1 to the first caller", () => {
    claimBlitzSlot("Bob", 1);
    expect(useGameStore.getState().currentRound!.playerOrder).toEqual(["Alice", "Bob"]);
  });

  it("rejects slot 2 before slot 1", () => {
    claimBlitzSlot("Bob", 2);
    expect(useGameStore.getState().currentRound!.playerOrder).toEqual(["Alice"]);
  });

  it("advances to blitz-pick when all slots filled", () => {
    claimBlitzSlot("Bob", 1);
    claimBlitzSlot("Carol", 2);
    const s = useGameStore.getState();
    expect(s.phase).toBe("blitz-pick");
    expect(s.currentRound!.playerOrder).toEqual(["Alice", "Bob", "Carol"]);
    expect(s.timer).not.toBeNull();
  });
});

describe("selectBlitzItem", () => {
  beforeEach(() => {
    setupBlitzState({ phase: "blitz-pick" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        playerOrder: ["Alice", "Bob", "Carol"],
        blitzTaskIndex: 0,
      },
    });
  });

  it("records itemIndex on the pre-assigned task and moves to blitz-ready", () => {
    selectBlitzItem(1);
    const s = useGameStore.getState();
    expect(s.phase).toBe("blitz-ready");
    expect(s.currentRound?.blitzTaskIndex).toBe(0);
    expect(s.currentRound?.blitzItemIndex).toBe(1);
  });

  it("rejects when no task is assigned to the round", () => {
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        blitzTaskIndex: undefined,
      },
    });
    selectBlitzItem(0);
    expect(useGameStore.getState().phase).toBe("blitz-pick");
  });

  it("rejects out-of-range item index", () => {
    selectBlitzItem(99);
    expect(useGameStore.getState().phase).toBe("blitz-pick");
  });
});

describe("setBlitzPlayerReady", () => {
  beforeEach(() => {
    setupBlitzState({ phase: "blitz-ready" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        playerOrder: ["Alice", "Bob", "Carol"],
        blitzTaskIndex: 0,
        blitzItemIndex: 0,
      },
    });
  });

  it("marks player as ready", () => {
    setBlitzPlayerReady("Alice");
    const alice = useGameStore.getState().players.find((p) => p.name === "Alice");
    expect(alice?.ready).toBe(true);
    expect(useGameStore.getState().phase).toBe("blitz-ready");
  });

  it("transitions to blitz-active when all ready", () => {
    setBlitzPlayerReady("Alice");
    setBlitzPlayerReady("Bob");
    setBlitzPlayerReady("Carol");
    const s = useGameStore.getState();
    expect(s.phase).toBe("blitz-active");
    expect(s.timer).not.toBeNull();
    expect(s.currentRound!.activeTimerStartedAt).toBeGreaterThan(0);
  });
});

describe("submitBlitzAnswer in blitz-active", () => {
  beforeEach(() => {
    setupBlitzState({ phase: "blitz-active" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        playerOrder: ["Alice", "Bob", "Carol"],
        blitzTaskIndex: 0,
        blitzItemIndex: 0, // "Коза"
        activeTimerStartedAt: performance.now(),
      },
    });
  });

  it("only the last player may answer", () => {
    submitBlitzAnswer("Bob", "Коза");
    expect(useGameStore.getState().phase).toBe("blitz-active");
    submitBlitzAnswer("Carol", "Коза");
    expect(useGameStore.getState().phase).toBe("blitz-review");
  });

  it("correct answer gives non-zero score", () => {
    submitBlitzAnswer("Carol", "коза");
    const review = useGameStore.getState().currentRound!.reviewResult;
    expect(review).toBeDefined();
    expect(review!.evaluations[0]?.correct).toBe(true);
    expect(review!.score).toBeGreaterThan(0);
  });

  it("wrong answer scores 0", () => {
    submitBlitzAnswer("Carol", "Корова");
    const review = useGameStore.getState().currentRound!.reviewResult;
    expect(review!.evaluations[0]?.correct).toBe(false);
    expect(review!.score).toBe(0);
  });
});

describe("skipBlitzAnswer", () => {
  beforeEach(() => {
    setupBlitzState({ phase: "blitz-answer" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        playerOrder: ["Alice", "Bob", "Carol"],
        blitzTaskIndex: 0,
        blitzItemIndex: 0,
        activeTimerStartedAt: performance.now() - 1_000_000, // already past
      },
    });
  });

  it("advances the queue from end toward captain", () => {
    skipBlitzAnswer("Carol");
    const s = useGameStore.getState();
    const next = getNextBlitzAnswerer(s.currentRound!.playerOrder!, s.currentRound!.answers);
    expect(next).toBe("Bob");
  });

  it("all skips → blitz-review with score 0", () => {
    skipBlitzAnswer("Carol");
    skipBlitzAnswer("Bob");
    const s = useGameStore.getState();
    expect(s.phase).toBe("blitz-review");
    expect(s.currentRound!.reviewResult!.score).toBe(0);
  });

  it("rejects skip by wrong player", () => {
    skipBlitzAnswer("Bob"); // not up yet
    const next = getNextBlitzAnswerer(
      useGameStore.getState().currentRound!.playerOrder!,
      useGameStore.getState().currentRound!.answers,
    );
    expect(next).toBe("Carol");
  });
});

describe("confirmBlitzReview", () => {
  beforeEach(() => {
    setupBlitzState({ phase: "blitz-review" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        playerOrder: ["Alice", "Bob", "Carol"],
        blitzTaskIndex: 0,
        reviewResult: {
          evaluations: [{ playerName: "Carol", correct: true }],
          groups: [["Carol"]],
          score: 400,
          bonusTime: 0,
          bonusTimeMultiplier: 1,
          bonusTimeApplied: false,
          jokerApplied: false,
        },
      },
    });
  });

  it("appends history, updates team score, transitions to next blitz", () => {
    confirmBlitzReview();
    const s = useGameStore.getState();
    expect(s.history.length).toBe(1);
    expect(s.history[0]?.score).toBe(400);
    expect(s.teams.find((t) => t.id === "red")!.score).toBe(400);
    // second blitz task remains unplayed
    expect(s.phase).toBe("blitz-captain");
    expect(s.currentRound?.type).toBe("blitz");
  });

  it("transitions to finale when no blitz tasks remain", () => {
    useGameStore.setState({
      history: [
        { type: "blitz", teamId: "red", captainName: "Bob", blitzTaskIndex: 1, score: 200, jokerUsed: false },
      ],
    });
    confirmBlitzReview();
    expect(useGameStore.getState().phase).toBe("finale");
  });
});

describe("handleBlitzTimerExpire", () => {
  it("blitz-captain → auto-assigns captain and order", () => {
    setupBlitzState({
      phase: "blitz-captain",
      timer: { startedAt: 0, duration: 1 },
    });
    handleBlitzTimerExpire("blitz-captain");
    const s = useGameStore.getState();
    expect(s.phase).toBe("blitz-pick");
    expect(s.currentRound!.captainName).not.toBe("");
    expect(s.currentRound!.playerOrder!.length).toBe(3);
  });

  it("blitz-active → transitions to blitz-answer", () => {
    setupBlitzState({ phase: "blitz-active" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        playerOrder: ["Alice", "Bob", "Carol"],
        blitzTaskIndex: 0,
        blitzItemIndex: 0,
      },
    });
    handleBlitzTimerExpire("blitz-active");
    const s = useGameStore.getState();
    expect(s.phase).toBe("blitz-answer");
    expect(s.timer).not.toBeNull();
  });
});
