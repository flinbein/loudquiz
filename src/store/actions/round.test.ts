import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";
import {
  claimCaptain,
  selectQuestion,
  activateJoker,
  setPlayerReady,
  submitAnswer,
  initReview,
  evaluateAnswer,
  mergeAnswerGroups,
  splitAnswerFromGroup,
  confirmReview,
  confirmScore,
  disputeReview,
} from "./round";
import type { GameState } from "@/types/game";

function setupRoundState(overrides?: Partial<GameState>) {
  useGameStore.setState({
    phase: "round-captain",
    settings: { mode: "manual", teamMode: "single", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 0, pastQuestions: [] },
    players: [
      { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
      { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
      { name: "Carol", emoji: "👺", team: "red", online: true, ready: true },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }],
    topics: [
      { name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: ["a1"] }, { text: "Q2", difficulty: 150, acceptedAnswers: ["a2"] }] },
      { name: "T2", questions: [{ text: "Q3", difficulty: 200, acceptedAnswers: ["a3"] }, { text: "Q4", difficulty: 120, acceptedAnswers: ["a4"] }] },
    ],
    blitzTasks: [],
    currentRound: { type: "round", teamId: "red", captainName: "", jokerActive: false, answers: {}, activeTimerStartedAt: 0, bonusTime: 0 },
    history: [],
    timer: null,
    ...overrides,
  });
}

describe("claimCaptain", () => {
  beforeEach(() => setupRoundState());

  it("sets captain and transitions to round-pick", () => {
    claimCaptain("Alice");
    const s = useGameStore.getState();
    expect(s.currentRound!.captainName).toBe("Alice");
    expect(s.phase).toBe("round-pick");
    expect(s.timer).not.toBeNull();
  });

  it("rejects if not in round-captain phase", () => {
    useGameStore.setState({ phase: "round-pick" });
    claimCaptain("Alice");
    expect(useGameStore.getState().currentRound!.captainName).toBe("");
  });

  it("rejects consecutive captain", () => {
    setupRoundState({
      history: [{ type: "round", teamId: "red", captainName: "Alice", score: 100, jokerUsed: false, questionIndex: 0, playerResults: [], difficulty: 100, topicIndex: 0, bonusTimeApplied: false, bonusTime: 0, bonusTimeMultiplier: 1, groups: [] }],
    });
    claimCaptain("Alice");
    expect(useGameStore.getState().currentRound!.captainName).toBe("");
  });
});

describe("selectQuestion", () => {
  beforeEach(() => {
    setupRoundState({ phase: "round-pick" });
    useGameStore.setState({ currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice" } });
  });

  it("sets questionIndex and transitions to round-ready", () => {
    selectQuestion(0);
    const s = useGameStore.getState();
    expect(s.currentRound!.questionIndex).toBe(0);
    expect(s.phase).toBe("round-ready");
  });

  it("rejects already played question", () => {
    useGameStore.setState({
      history: [{ type: "round", teamId: "red", captainName: "Bob", questionIndex: 0, score: 100, jokerUsed: false, playerResults: [], difficulty: 100, topicIndex: 0, bonusTimeApplied: false, bonusTime: 0, bonusTimeMultiplier: 1, groups: [] }],
    });
    selectQuestion(0);
    expect(useGameStore.getState().currentRound!.questionIndex).toBeUndefined();
  });
});

describe("activateJoker", () => {
  beforeEach(() => {
    setupRoundState({ phase: "round-pick" });
  });

  it("activates joker", () => {
    activateJoker();
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(true);
  });

  it("rejects if already used by team", () => {
    useGameStore.setState({ teams: [{ id: "red", score: 0, jokerUsed: true }] });
    activateJoker();
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(false);
  });

  it("activates when called by captain (playerName matches)", () => {
    useGameStore.setState({
      currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice" },
    });
    activateJoker("Alice");
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(true);
  });

  it("rejects when called by non-captain player", () => {
    useGameStore.setState({
      currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice" },
    });
    activateJoker("Bob");
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(false);
  });

  it("activates when called with undefined (host bypass)", () => {
    useGameStore.setState({
      currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice" },
    });
    activateJoker();
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(true);
  });
});

describe("setPlayerReady", () => {
  beforeEach(() => {
    setupRoundState({ phase: "round-ready" });
    useGameStore.setState({
      players: useGameStore.getState().players.map((p) => ({ ...p, ready: false })),
      currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice", questionIndex: 0 },
    });
  });

  it("marks player ready", () => {
    setPlayerReady("Bob");
    const bob = useGameStore.getState().players.find((p) => p.name === "Bob");
    expect(bob!.ready).toBe(true);
  });

  it("transitions to round-active when all ready", () => {
    setPlayerReady("Alice");
    setPlayerReady("Bob");
    setPlayerReady("Carol");
    const s = useGameStore.getState();
    expect(s.phase).toBe("round-active");
    expect(s.timer).not.toBeNull();
  });
});

describe("submitAnswer", () => {
  beforeEach(() => {
    setupRoundState({ phase: "round-active" });
    useGameStore.setState({
      currentRound: { ...useGameStore.getState().currentRound!, captainName: "Alice", questionIndex: 0 },
    });
  });

  it("stores answer for responder", () => {
    submitAnswer("Bob", "my answer");
    const answers = useGameStore.getState().currentRound!.answers;
    expect(answers.Bob).toBeDefined();
    expect(answers.Bob?.text).toBe("my answer");
  });

  it("stores empty text for give-up", () => {
    submitAnswer("Bob", "");
    expect(useGameStore.getState().currentRound?.answers?.Bob?.text).toBe("");
  });

  it("accepts captain submitting their own answer", () => {
    submitAnswer("Alice", "captain answer");
    expect(useGameStore.getState().currentRound?.answers?.Alice?.text).toBe("captain answer");
  });
});

describe("initReview", () => {
  beforeEach(() => {
    setupRoundState({ phase: "round-review" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        questionIndex: 0,
        answers: {
          Bob: { text: "good answer", timestamp: 5000 },
          Carol: { text: "", timestamp: 8000 },
        },
      },
    });
  });

  it("initializes reviewResult with evaluations and groups", () => {
    initReview();
    const review = useGameStore.getState().currentRound!.reviewResult!;
    expect(review.evaluations).toHaveLength(2);
    expect(review.evaluations.find((e) => e.playerName === "Bob")!.correct).toBeNull();
    expect(review.evaluations.find((e) => e.playerName === "Carol")!.correct).toBe(false);
    expect(review.groups).toEqual([["Bob"], ["Carol"]]);
    expect(review.score).toBe(0);
  });
});

describe("evaluateAnswer", () => {
  beforeEach(() => {
    setupRoundState({ phase: "round-review" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        questionIndex: 0,
        answers: { Bob: { text: "ans", timestamp: 5000 }, Carol: { text: "ans2", timestamp: 6000 } },
        reviewResult: {
          evaluations: [
            { playerName: "Bob", correct: null },
            { playerName: "Carol", correct: null },
          ],
          groups: [["Bob"], ["Carol"]],
          score: 0,
          bonusTimeMultiplier: 0,
          bonusTime: 0,
          bonusTimeApplied: false,
          jokerApplied: false,
          aiStatus: "idle",
        },
      },
    });
  });

  it("toggles answer evaluation", () => {
    evaluateAnswer("Bob", true);
    expect(useGameStore.getState().currentRound!.reviewResult!.evaluations.find((e) => e.playerName === "Bob")!.correct).toBe(true);
  });
});

describe("mergeAnswerGroups", () => {
  beforeEach(() => {
    setupRoundState({ phase: "round-review" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        reviewResult: {
          evaluations: [
            { playerName: "Bob", correct: null },
            { playerName: "Carol", correct: null },
          ],
          groups: [["Bob"], ["Carol"]],
          score: 0,
          bonusTimeMultiplier: 0,
          bonusTime: 0,
          bonusTimeApplied: false,
          jokerApplied: false,
          aiStatus: "idle",
        },
      },
    });
  });

  it("merges two groups and marks as correct", () => {
    mergeAnswerGroups("Bob", "Carol");
    const review = useGameStore.getState().currentRound!.reviewResult!;
    expect(review.groups).toEqual([["Bob", "Carol"]]);
    expect(review.evaluations.find((e) => e.playerName === "Bob")!.correct).toBe(true);
    expect(review.evaluations.find((e) => e.playerName === "Carol")!.correct).toBe(true);
  });
});

describe("splitAnswerFromGroup", () => {
  it("splits a player out of a merged group", () => {
    setupRoundState({ phase: "round-review" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        reviewResult: {
          evaluations: [
            { playerName: "Bob", correct: true },
            { playerName: "Carol", correct: true },
          ],
          groups: [["Bob", "Carol"]],
          score: 0,
          bonusTimeMultiplier: 0,
          bonusTime: 0,
          bonusTimeApplied: false,
          jokerApplied: false,
          aiStatus: "idle",
        },
      },
    });
    splitAnswerFromGroup("Carol");
    const review = useGameStore.getState().currentRound!.reviewResult!;
    expect(review.groups).toEqual([["Bob"], ["Carol"]]);
  });
});

describe("confirmReview", () => {
  it("calculates score, saves to history, transitions", () => {
    setupRoundState({ phase: "round-review" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        captainName: "Alice",
        questionIndex: 0,
        jokerActive: false,
        activeTimerStartedAt: 1000,
        answers: {
          Bob: { text: "answer1", timestamp: 5000 },
          Carol: { text: "answer2", timestamp: 6000 },
        },
        reviewResult: {
          evaluations: [
            { playerName: "Bob", correct: true },
            { playerName: "Carol", correct: true },
          ],
          groups: [["Bob", "Carol"]],
          score: 0,
          bonusTimeMultiplier: 0,
          bonusTime: 0,
          bonusTimeApplied: false,
          jokerApplied: false,
          aiStatus: "idle",
        },
      },
    });
    confirmScore();
    confirmReview();
    const s = useGameStore.getState();
    expect(s.history).toHaveLength(1);
    expect(s.history[0]?.score).toBe(100); // 100 × 1 group (merged into one stack)
    expect(s.teams[0]?.score).toBe(100);
    // 3 unplayed questions remain, so next phase is round-captain
    expect(s.phase).toBe("round-captain");
    expect(s.currentRound!.captainName).toBe("");

    const result = s.history[0]!;
    expect(result.playerResults).toHaveLength(2);
    expect(result.playerResults[0]).toMatchObject({ playerName: "Bob", answerText: "answer1", correct: true, groupIndex: 0 });
    expect(result.playerResults[1]).toMatchObject({ playerName: "Carol", answerText: "answer2", correct: true, groupIndex: 0 });
    expect(result.difficulty).toBe(100);
    expect(result.topicIndex).toBe(0);
    expect(result.groups).toEqual([["Bob", "Carol"]]);
    expect(result.bonusTimeApplied).toBe(false);
  });
});

describe("disputeReview", () => {
  it("goes back to evaluation", () => {
    setupRoundState({ phase: "round-result" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        answers: { Bob: { text: "ans", timestamp: 5000 } },
        reviewResult: {
          evaluations: [{ playerName: "Bob", correct: true }],
          groups: [["Bob"]],
          score: 150,
          bonusTimeMultiplier: 0,
          bonusTime: 0,
          bonusTimeApplied: false,
          jokerApplied: false,
          aiStatus: "idle",
        },
      },
    });
    disputeReview();
    const review = useGameStore.getState().currentRound!.reviewResult!;
    expect(review.score).toBe(0);
    expect(review.evaluations[0]?.correct).toBeTruthy();
  });
});

describe("submitAnswer dual-mode guard", () => {
  it("rejects answer from opponent team player", () => {
    setupRoundState({
      phase: "round-active",
      settings: { mode: "manual", teamMode: "dual", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
        { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        { name: "Eve", emoji: "🐸", team: "blue", online: true, ready: true },
      ],
      teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
      currentRound: { type: "round", teamId: "red", captainName: "Alice", questionIndex: 0, jokerActive: false, answers: {}, activeTimerStartedAt: 0, bonusTime: 0 },
    });
    submitAnswer("Dave", "opponent answer");
    expect(useGameStore.getState().currentRound!.answers).not.toHaveProperty("Dave");
  });

  it("accepts answer from active team player", () => {
    setupRoundState({
      phase: "round-active",
      settings: { mode: "manual", teamMode: "dual", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
        { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
        { name: "Eve", emoji: "🐸", team: "blue", online: true, ready: true },
      ],
      teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
      currentRound: { type: "round", teamId: "red", captainName: "Alice", questionIndex: 0, jokerActive: false, answers: {}, activeTimerStartedAt: 0, bonusTime: 0 },
    });
    submitAnswer("Bob", "team answer");
    expect(useGameStore.getState().currentRound!.answers).toHaveProperty("Bob");
  });
});

describe("initReview dual-mode filter", () => {
  it("excludes opponent players from evaluations", () => {
    setupRoundState({
      phase: "round-review",
      settings: { mode: "manual", teamMode: "dual", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
        { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
      ],
      teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
      currentRound: {
        type: "round", teamId: "red", captainName: "Alice", questionIndex: 0,
        jokerActive: false,
        answers: {
          Alice: { text: "a1", timestamp: 1000 },
          Bob: { text: "b1", timestamp: 2000 },
          Dave: { text: "sneaky", timestamp: 3000 },
        },
        activeTimerStartedAt: 0, bonusTime: 0,
      },
    });
    initReview();
    const review = useGameStore.getState().currentRound!.reviewResult!;
    const names = review.evaluations.map((e) => e.playerName);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
    expect(names).not.toContain("Dave");
  });
});
