# Phase 6: Раунды — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full round cycle (6 sub-phases) for manual mode, single team — the core gameplay loop.

**Architecture:** Pure logic functions (timer, captain, scoring, phase transitions) → Zustand store actions (round.ts) → UI components (Timer*, JokerState, TeamScore, ScoreFormula) → Page-level components (HostRound, PlayerRound) integrated via PlayPage and useTransport.

**Tech Stack:** React 19, TypeScript (strict), Zustand, CSS Modules, i18next, Ladle, Vitest

**Spec:** `docs/superpowers/specs/2026-04-08-phase6-rounds-design.md`

---

### Task 1: Type Changes

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/types/transport.ts`

- [ ] **Step 1: Update AnswerEvaluation to tri-state**

In `src/types/game.ts`, change `correct: boolean` to `correct: boolean | null`:

```ts
export interface AnswerEvaluation {
  playerName: string;
  correct: boolean | null;  // null = not evaluated, true = correct, false = incorrect
  aiComment?: string;
}
```

- [ ] **Step 2: Add new PlayerAction kinds**

In `src/types/transport.ts`, add `dispute-review` and `next-round` to the PlayerAction union:

```ts
export type PlayerAction =
  | { kind: "join"; name: string }
  | { kind: "set-team"; team: string }
  | { kind: "set-ready"; ready: boolean }
  | { kind: "change-emoji" }
  | { kind: "start-game" }
  | { kind: "claim-captain" }
  | { kind: "select-question"; questionIndex: number }
  | { kind: "activate-joker" }
  | { kind: "submit-answer"; text: string }
  | { kind: "claim-blitz-captain" }
  | { kind: "select-blitz-task"; taskId: string }
  | { kind: "submit-blitz-answer"; text: string }
  | { kind: "skip-blitz-answer" }
  | { kind: "suggest-topic"; text: string }
  | { kind: "dispute-review" }
  | { kind: "next-round" };
```

- [ ] **Step 3: Fix getCurrentQuestion selector**

In `src/store/selectors.ts`, the current `getCurrentQuestion` has a bug — it doesn't subtract cumulative topic offsets. Replace it:

```ts
export function getCurrentQuestion(state: GameState) {
  if (!state.currentRound || state.currentRound.questionIndex == null)
    return undefined;
  let remaining = state.currentRound.questionIndex;
  for (const topic of state.topics) {
    if (remaining < topic.questions.length) {
      return topic.questions[remaining];
    }
    remaining -= topic.questions.length;
  }
  return undefined;
}
```

Add a helper to get the topic+question from linear index:

```ts
export function getQuestionByLinearIndex(
  state: GameState,
  linearIndex: number,
): { topic: Topic; topicIndex: number; question: Question; questionIndex: number } | undefined {
  let remaining = linearIndex;
  for (let ti = 0; ti < state.topics.length; ti++) {
    const topic = state.topics[ti];
    if (remaining < topic.questions.length) {
      return { topic, topicIndex: ti, question: topic.questions[remaining], questionIndex: remaining };
    }
    remaining -= topic.questions.length;
  }
  return undefined;
}

export function toLinearQuestionIndex(state: GameState, topicIndex: number, questionIndex: number): number {
  let linear = 0;
  for (let i = 0; i < topicIndex; i++) {
    linear += state.topics[i].questions.length;
  }
  return linear + questionIndex;
}
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no errors)

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/types/transport.ts src/store/selectors.ts
git commit -m "feat: update types for round phases — tri-state evaluation, new actions, fix selector"
```

---

### Task 2: Logic — timer.ts

**Files:**
- Create: `src/logic/timer.ts`

- [ ] **Step 1: Create timer.ts with duration formulas and timer utilities**

```ts
import type { TimerState } from "@/types/game";

export function getCaptainTimerDuration(): number {
  return 60;
}

export function getPickTimerDuration(): number {
  return 60;
}

export function getActiveTimerDuration(respondersCount: number): number {
  return 50 + 5 * respondersCount;
}

export function getAnswerTimerDuration(): number {
  return 20;
}

export function createTimer(duration: number): TimerState {
  return { startedAt: Date.now(), duration };
}

export function getRemainingTime(timer: TimerState): number {
  const elapsed = (Date.now() - timer.startedAt) / 1000;
  return Math.max(0, timer.duration - elapsed);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/logic/timer.ts
git commit -m "feat: add timer duration formulas and utilities"
```

---

### Task 3: Logic — captain.ts + tests

**Files:**
- Create: `src/logic/captain.ts`
- Create: `src/logic/captain.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
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
    const single = [players[0]];
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
    const single = [players[0]];
    const captain = getRandomCaptain(single, [makeResult("Alice")]);
    expect(captain).toBe("Alice");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic/captain.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement captain.ts**

```ts
import type { PlayerData, RoundResult } from "@/types/game";

export function canBeCaptain(playerName: string, history: RoundResult[]): boolean {
  if (history.length === 0) return true;
  const lastRound = history[history.length - 1];
  return lastRound.captainName !== playerName;
}

export function getEligibleCaptains(
  teamPlayers: PlayerData[],
  history: RoundResult[],
): PlayerData[] {
  const eligible = teamPlayers.filter((p) => canBeCaptain(p.name, history));
  // Fallback: if nobody is eligible (team of 1), allow everyone
  return eligible.length > 0 ? eligible : teamPlayers;
}

export function getRandomCaptain(
  teamPlayers: PlayerData[],
  history: RoundResult[],
): string {
  const eligible = getEligibleCaptains(teamPlayers, history);
  const index = Math.floor(Math.random() * eligible.length);
  return eligible[index].name;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic/captain.test.ts`
Expected: PASS — all 7 tests

- [ ] **Step 5: Commit**

```bash
git add src/logic/captain.ts src/logic/captain.test.ts
git commit -m "feat: add captain selection logic with consecutive rule"
```

---

### Task 4: Logic — scoring.ts + tests

**Files:**
- Create: `src/logic/scoring.ts`
- Create: `src/logic/scoring.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { calculateRoundScore, calculateBonusMultiplier, checkBonusConditions } from "./scoring";
import type { PlayerAnswer, AnswerEvaluation } from "@/types/game";

describe("calculateRoundScore", () => {
  it("scores basic round: difficulty × correctCount", () => {
    expect(calculateRoundScore(100, 4, false, 0)).toBe(400);
  });

  it("scores zero when no correct answers", () => {
    expect(calculateRoundScore(100, 0, false, 0)).toBe(0);
  });

  it("doubles with joker", () => {
    expect(calculateRoundScore(100, 4, true, 0)).toBe(800);
  });

  it("applies bonus multiplier", () => {
    expect(calculateRoundScore(100, 4, false, 1.2)).toBe(480);
  });

  it("applies joker + bonus", () => {
    expect(calculateRoundScore(100, 4, true, 1.2)).toBe(960);
  });

  it("handles partial correct (2 out of 4)", () => {
    expect(calculateRoundScore(100, 2, false, 0)).toBe(200);
  });
});

describe("calculateBonusMultiplier", () => {
  it("returns multiplier from remaining time", () => {
    expect(calculateBonusMultiplier(12, 60)).toBeCloseTo(1.2);
  });

  it("returns 0 when no bonus time", () => {
    expect(calculateBonusMultiplier(0, 60)).toBe(0);
  });
});

describe("checkBonusConditions", () => {
  const activeDuration = 60;

  it("grants bonus when all correct, unique, and answered in time", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 1000 },
      Carol: { text: "answer2", timestamp: 2000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: true },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(true);
    expect(result.bonusTime).toBeGreaterThan(0);
  });

  it("denies bonus when not all correct", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 1000 },
      Carol: { text: "wrong", timestamp: 2000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: false },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when answers are merged (not unique)", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "same", timestamp: 1000 },
      Carol: { text: "same", timestamp: 2000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: true },
    ];
    const groups = [["Bob", "Carol"]]; // merged
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when not all responders answered", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 1000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
    ];
    const groups = [["Bob"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(false);
  });

  it("denies bonus when a player gave up (empty text)", () => {
    const answers: Record<string, PlayerAnswer> = {
      Bob: { text: "answer1", timestamp: 1000 },
      Carol: { text: "", timestamp: 2000 },
    };
    const evaluations: AnswerEvaluation[] = [
      { playerName: "Bob", correct: true },
      { playerName: "Carol", correct: false },
    ];
    const groups = [["Bob"], ["Carol"]];
    const result = checkBonusConditions(answers, evaluations, groups, 2, activeDuration);
    expect(result.hasBonus).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic/scoring.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement scoring.ts**

```ts
import type { PlayerAnswer, AnswerEvaluation } from "@/types/game";

export function calculateRoundScore(
  difficulty: number,
  correctCount: number,
  jokerActive: boolean,
  bonusMultiplier: number,
): number {
  if (correctCount === 0) return 0;
  const jokerMul = jokerActive ? 2 : 1;
  const bonusMul = bonusMultiplier > 0 ? bonusMultiplier : 1;
  return Math.round(difficulty * correctCount * jokerMul * bonusMul);
}

export function calculateBonusMultiplier(
  bonusTime: number,
  totalTime: number,
): number {
  if (bonusTime <= 0 || totalTime <= 0) return 0;
  return 1 + bonusTime / totalTime;
}

export function checkBonusConditions(
  answers: Record<string, PlayerAnswer>,
  evaluations: AnswerEvaluation[],
  groups: string[][],
  respondersCount: number,
  activeDuration: number,
): { hasBonus: boolean; bonusTime: number } {
  // 1. All responders answered
  const answeredCount = Object.keys(answers).length;
  if (answeredCount < respondersCount) {
    return { hasBonus: false, bonusTime: 0 };
  }

  // 2. All answers correct (no empty text / gave up)
  const allCorrect = evaluations.every((e) => e.correct === true);
  if (!allCorrect) {
    return { hasBonus: false, bonusTime: 0 };
  }

  // 3. All answers unique (no merged groups — each group has exactly 1 player)
  const allUnique = groups.every((g) => g.length === 1);
  if (!allUnique) {
    return { hasBonus: false, bonusTime: 0 };
  }

  // Bonus time = active duration minus the latest answer timestamp
  // (timestamps are relative offsets within active phase in seconds)
  const maxTimestamp = Math.max(...Object.values(answers).map((a) => a.timestamp));
  const bonusTime = Math.max(0, activeDuration - maxTimestamp / 1000);
  return { hasBonus: true, bonusTime };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic/scoring.test.ts`
Expected: PASS — all 11 tests

- [ ] **Step 5: Commit**

```bash
git add src/logic/scoring.ts src/logic/scoring.test.ts
git commit -m "feat: add scoring formulas — round score, bonus, joker"
```

---

### Task 5: Logic — phaseTransitions.ts + tests

**Files:**
- Create: `src/logic/phaseTransitions.ts`
- Create: `src/logic/phaseTransitions.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { getNextRoundPhase, getNextPhaseAfterReview, getPlayedQuestionIndices, createNextRoundState, getTotalQuestionCount } from "./phaseTransitions";
import type { GameState, RoundResult } from "@/types/game";

describe("getNextRoundPhase", () => {
  it("round-captain → round-pick", () => {
    expect(getNextRoundPhase("round-captain")).toBe("round-pick");
  });
  it("round-pick → round-ready", () => {
    expect(getNextRoundPhase("round-pick")).toBe("round-ready");
  });
  it("round-ready → round-active", () => {
    expect(getNextRoundPhase("round-ready")).toBe("round-active");
  });
  it("round-active → round-answer", () => {
    expect(getNextRoundPhase("round-active")).toBe("round-answer");
  });
  it("round-answer → round-review", () => {
    expect(getNextRoundPhase("round-answer")).toBe("round-review");
  });
});

describe("getNextPhaseAfterReview", () => {
  it("returns round-captain when unplayed questions remain", () => {
    const history: RoundResult[] = [
      { type: "round", teamId: "t1", captainName: "A", questionIndex: 0, score: 100, jokerUsed: false },
    ];
    // 2 topics × 2 questions = 4 total, 1 played
    expect(getNextPhaseAfterReview(4, history, 0)).toBe("round-captain");
  });

  it("returns blitz-captain when all questions played and blitz tasks exist", () => {
    const history: RoundResult[] = [
      { type: "round", teamId: "t1", captainName: "A", questionIndex: 0, score: 100, jokerUsed: false },
      { type: "round", teamId: "t1", captainName: "B", questionIndex: 1, score: 100, jokerUsed: false },
    ];
    expect(getNextPhaseAfterReview(2, history, 3)).toBe("blitz-captain");
  });

  it("returns finale when all questions played and no blitz tasks", () => {
    const history: RoundResult[] = [
      { type: "round", teamId: "t1", captainName: "A", questionIndex: 0, score: 100, jokerUsed: false },
    ];
    expect(getNextPhaseAfterReview(1, history, 0)).toBe("finale");
  });
});

describe("getPlayedQuestionIndices", () => {
  it("returns empty for no history", () => {
    expect(getPlayedQuestionIndices([])).toEqual([]);
  });

  it("returns indices of played round questions", () => {
    const history: RoundResult[] = [
      { type: "round", teamId: "t1", captainName: "A", questionIndex: 0, score: 100, jokerUsed: false },
      { type: "round", teamId: "t1", captainName: "B", questionIndex: 3, score: 200, jokerUsed: false },
      { type: "blitz", teamId: "t1", captainName: "C", blitzTaskId: "b1", score: 50, jokerUsed: false },
    ];
    expect(getPlayedQuestionIndices(history)).toEqual([0, 3]);
  });
});

describe("getTotalQuestionCount", () => {
  it("sums questions across all topics", () => {
    const topics = [
      { name: "T1", questions: [{ text: "q1", difficulty: 100, acceptedAnswers: [] }, { text: "q2", difficulty: 100, acceptedAnswers: [] }] },
      { name: "T2", questions: [{ text: "q3", difficulty: 200, acceptedAnswers: [] }] },
    ];
    expect(getTotalQuestionCount(topics)).toBe(3);
  });
});

describe("createNextRoundState", () => {
  it("creates a fresh round state with team id", () => {
    const round = createNextRoundState("team-red");
    expect(round.type).toBe("round");
    expect(round.teamId).toBe("team-red");
    expect(round.captainName).toBe("");
    expect(round.jokerActive).toBe(false);
    expect(round.answers).toEqual({});
    expect(round.bonusTime).toBe(0);
    expect(round.reviewResult).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic/phaseTransitions.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement phaseTransitions.ts**

```ts
import type { GamePhase, RoundPhase, RoundState, RoundResult, Topic } from "@/types/game";

const ROUND_PHASE_ORDER: RoundPhase[] = [
  "round-captain",
  "round-pick",
  "round-ready",
  "round-active",
  "round-answer",
  "round-review",
];

export function getNextRoundPhase(current: RoundPhase): RoundPhase {
  const index = ROUND_PHASE_ORDER.indexOf(current);
  return ROUND_PHASE_ORDER[index + 1];
}

export function getNextPhaseAfterReview(
  totalQuestions: number,
  history: RoundResult[],
  blitzTaskCount: number,
): GamePhase {
  const playedCount = getPlayedQuestionIndices(history).length;
  if (playedCount < totalQuestions) return "round-captain";
  if (blitzTaskCount > 0) return "blitz-captain";
  return "finale";
}

export function getPlayedQuestionIndices(history: RoundResult[]): number[] {
  return history
    .filter((r) => r.type === "round" && r.questionIndex != null)
    .map((r) => r.questionIndex!);
}

export function getTotalQuestionCount(topics: Topic[]): number {
  return topics.reduce((sum, t) => sum + t.questions.length, 0);
}

export function createNextRoundState(teamId: string): RoundState {
  return {
    type: "round",
    teamId,
    captainName: "",
    jokerActive: false,
    answers: {},
    bonusTime: 0,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic/phaseTransitions.test.ts`
Expected: PASS — all 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/logic/phaseTransitions.ts src/logic/phaseTransitions.test.ts
git commit -m "feat: add phase transition logic and round state factory"
```

---

### Task 6: Store actions — round.ts + tests

**Files:**
- Create: `src/store/actions/round.ts`
- Create: `src/store/actions/round.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "@/store/gameStore";
import {
  claimCaptain,
  selectQuestion,
  activateJoker,
  setPlayerReady,
  submitAnswer,
  handleTimerExpire,
  initReview,
  evaluateAnswer,
  mergeAnswerGroups,
  splitAnswerFromGroup,
  confirmReview,
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
    teams: [{ id: "red", color: "red", score: 0, jokerUsed: false }],
    topics: [
      { name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: ["a1"] }, { text: "Q2", difficulty: 150, acceptedAnswers: ["a2"] }] },
      { name: "T2", questions: [{ text: "Q3", difficulty: 200, acceptedAnswers: ["a3"] }, { text: "Q4", difficulty: 120, acceptedAnswers: ["a4"] }] },
    ],
    blitzTasks: [],
    currentRound: { type: "round", teamId: "red", captainName: "", jokerActive: false, answers: {}, bonusTime: 0 },
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
      history: [{ type: "round", teamId: "red", captainName: "Alice", score: 100, jokerUsed: false, questionIndex: 0 }],
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
      history: [{ type: "round", teamId: "red", captainName: "Bob", questionIndex: 0, score: 100, jokerUsed: false }],
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
    useGameStore.setState({ teams: [{ id: "red", color: "red", score: 0, jokerUsed: true }] });
    activateJoker();
    expect(useGameStore.getState().currentRound!.jokerActive).toBe(false);
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
    expect(answers.Bob.text).toBe("my answer");
  });

  it("stores empty text for give-up", () => {
    submitAnswer("Bob", "");
    expect(useGameStore.getState().currentRound!.answers.Bob.text).toBe("");
  });

  it("rejects captain submitting", () => {
    submitAnswer("Alice", "answer");
    expect(useGameStore.getState().currentRound!.answers.Alice).toBeUndefined();
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
          jokerApplied: false,
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
          jokerApplied: false,
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
          jokerApplied: false,
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
        answers: {
          Bob: { text: "answer1", timestamp: 5000 },
          Carol: { text: "answer2", timestamp: 6000 },
        },
        reviewResult: {
          evaluations: [
            { playerName: "Bob", correct: true },
            { playerName: "Carol", correct: true },
          ],
          groups: [["Bob"], ["Carol"]],
          score: 0,
          jokerApplied: false,
        },
      },
    });
    confirmReview();
    const s = useGameStore.getState();
    expect(s.history).toHaveLength(1);
    expect(s.history[0].score).toBe(200); // 100 × 2
    expect(s.teams[0].score).toBe(200);
    // 3 unplayed questions remain, so next phase is round-captain
    expect(s.phase).toBe("round-captain");
    expect(s.currentRound!.captainName).toBe("");
  });
});

describe("disputeReview", () => {
  it("resets score to 0 and goes back to evaluation", () => {
    setupRoundState({ phase: "round-review" });
    useGameStore.setState({
      currentRound: {
        ...useGameStore.getState().currentRound!,
        reviewResult: {
          evaluations: [{ playerName: "Bob", correct: true }],
          groups: [["Bob"]],
          score: 150,
          jokerApplied: false,
        },
      },
    });
    disputeReview();
    const review = useGameStore.getState().currentRound!.reviewResult!;
    expect(review.score).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement round.ts**

```ts
import { useGameStore } from "@/store/gameStore";
import { canBeCaptain, getRandomCaptain } from "@/logic/captain";
import { getPlayedQuestionIndices, getNextRoundPhase, getNextPhaseAfterReview, createNextRoundState, getTotalQuestionCount } from "@/logic/phaseTransitions";
import { createTimer, getPickTimerDuration, getCaptainTimerDuration, getActiveTimerDuration, getAnswerTimerDuration } from "@/logic/timer";
import { calculateRoundScore, checkBonusConditions, calculateBonusMultiplier } from "@/logic/scoring";
import type { AnswerEvaluation, RoundPhase } from "@/types/game";

export function claimCaptain(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-captain") return;
  if (!state.currentRound) return;

  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== state.currentRound.teamId) return;
  if (!canBeCaptain(playerName, state.history)) return;

  useGameStore.getState().setState({
    phase: "round-pick",
    currentRound: { ...state.currentRound, captainName: playerName },
    timer: createTimer(getPickTimerDuration()),
  });
}

export function selectQuestion(linearIndex: number): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-pick" || !state.currentRound) return;

  const played = getPlayedQuestionIndices(state.history);
  if (played.includes(linearIndex)) return;

  useGameStore.getState().setState({
    phase: "round-ready",
    currentRound: { ...state.currentRound, questionIndex: linearIndex },
    timer: null,
    players: state.players.map((p) => ({ ...p, ready: false })),
  });
}

export function activateJoker(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-pick" || !state.currentRound) return;

  const team = state.teams.find((t) => t.id === state.currentRound!.teamId);
  if (!team || team.jokerUsed) return;

  useGameStore.getState().setState({
    currentRound: { ...state.currentRound, jokerActive: true },
  });
}

export function setPlayerReady(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-ready" || !state.currentRound) return;

  const player = state.players.find((p) => p.name === playerName);
  if (!player || player.team !== state.currentRound.teamId) return;

  const players = state.players.map((p) =>
    p.name === playerName ? { ...p, ready: true } : p,
  );

  const teamPlayers = players.filter((p) => p.team === state.currentRound!.teamId);
  const allReady = teamPlayers.every((p) => p.ready);

  if (allReady) {
    const respondersCount = teamPlayers.length - 1;
    useGameStore.getState().setState({
      phase: "round-active",
      players,
      timer: createTimer(getActiveTimerDuration(respondersCount)),
    });
  } else {
    useGameStore.getState().setState({ players });
  }
}

export function submitAnswer(playerName: string, text: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-active" && state.phase !== "round-answer") return;
  if (!state.currentRound) return;
  if (state.currentRound.captainName === playerName) return;
  if (state.currentRound.answers[playerName]) return; // already answered

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      answers: {
        ...state.currentRound.answers,
        [playerName]: { text, timestamp: Date.now() },
      },
    },
  });
}

export function handleTimerExpire(phase: RoundPhase): void {
  const state = useGameStore.getState();
  if (state.phase !== phase || !state.currentRound) return;

  switch (phase) {
    case "round-captain": {
      const teamPlayers = state.players.filter((p) => p.team === state.currentRound!.teamId);
      const captain = getRandomCaptain(teamPlayers, state.history);
      useGameStore.getState().setState({
        phase: "round-pick",
        currentRound: { ...state.currentRound, captainName: captain },
        timer: createTimer(getPickTimerDuration()),
      });
      break;
    }
    case "round-pick": {
      // Auto-select first unplayed question
      const played = getPlayedQuestionIndices(state.history);
      const total = getTotalQuestionCount(state.topics);
      let autoIndex = 0;
      for (let i = 0; i < total; i++) {
        if (!played.includes(i)) { autoIndex = i; break; }
      }
      selectQuestion(autoIndex);
      break;
    }
    case "round-active": {
      useGameStore.getState().setState({
        phase: "round-answer",
        timer: createTimer(getAnswerTimerDuration()),
      });
      break;
    }
    case "round-answer": {
      useGameStore.getState().setState({
        phase: "round-review",
        timer: null,
      });
      initReview();
      break;
    }
  }
}

export function initReview(): void {
  const state = useGameStore.getState();
  if (!state.currentRound) return;

  const evaluations: AnswerEvaluation[] = Object.entries(state.currentRound.answers).map(
    ([playerName, answer]) => ({
      playerName,
      correct: answer.text === "" ? false : null,
    }),
  );

  const groups = Object.keys(state.currentRound.answers).map((name) => [name]);

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: {
        evaluations,
        groups,
        score: 0,
        jokerApplied: state.currentRound.jokerActive,
      },
    },
  });
}

export function evaluateAnswer(playerName: string, correct: boolean): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const evaluations = state.currentRound.reviewResult.evaluations.map((e) =>
    e.playerName === playerName ? { ...e, correct } : e,
  );

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: { ...state.currentRound.reviewResult, evaluations },
    },
  });
}

export function mergeAnswerGroups(sourcePlayer: string, targetPlayer: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const review = state.currentRound.reviewResult;
  const sourceGroupIdx = review.groups.findIndex((g) => g.includes(sourcePlayer));
  const targetGroupIdx = review.groups.findIndex((g) => g.includes(targetPlayer));
  if (sourceGroupIdx === -1 || targetGroupIdx === -1 || sourceGroupIdx === targetGroupIdx) return;

  const merged = [...review.groups[targetGroupIdx], ...review.groups[sourceGroupIdx]];
  const groups = review.groups.filter((_, i) => i !== sourceGroupIdx && i !== targetGroupIdx);
  groups.push(merged);

  // Auto-mark merged players as correct
  const evaluations = review.evaluations.map((e) =>
    merged.includes(e.playerName) ? { ...e, correct: true as boolean | null } : e,
  );

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: { ...review, groups, evaluations },
    },
  });
}

export function splitAnswerFromGroup(playerName: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const review = state.currentRound.reviewResult;
  const groupIdx = review.groups.findIndex((g) => g.includes(playerName));
  if (groupIdx === -1 || review.groups[groupIdx].length <= 1) return;

  const groups = review.groups.map((g, i) =>
    i === groupIdx ? g.filter((n) => n !== playerName) : g,
  );
  groups.push([playerName]);

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: { ...review, groups },
    },
  });
}

export function confirmReview(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  const review = state.currentRound.reviewResult;
  const round = state.currentRound;

  // Count correct answers
  const correctCount = review.evaluations.filter((e) => e.correct === true).length;

  // Get question difficulty
  let difficulty = 100;
  if (round.questionIndex != null) {
    let remaining = round.questionIndex;
    for (const topic of state.topics) {
      if (remaining < topic.questions.length) {
        difficulty = topic.questions[remaining].difficulty;
        break;
      }
      remaining -= topic.questions.length;
    }
  }

  // Check bonus conditions
  const teamPlayers = state.players.filter((p) => p.team === round.teamId);
  const respondersCount = teamPlayers.length - 1;
  const activeDuration = getActiveTimerDuration(respondersCount);
  const bonus = checkBonusConditions(round.answers, review.evaluations, review.groups, respondersCount, activeDuration);
  const bonusMultiplier = bonus.hasBonus ? calculateBonusMultiplier(bonus.bonusTime, activeDuration) : 0;

  const score = calculateRoundScore(difficulty, correctCount, round.jokerActive, bonusMultiplier);

  // Save result to history
  const result = {
    type: "round" as const,
    teamId: round.teamId,
    captainName: round.captainName,
    questionIndex: round.questionIndex,
    score,
    jokerUsed: round.jokerActive,
  };

  // Update team score and mark joker as used if active
  const teams = state.teams.map((t) => {
    if (t.id !== round.teamId) return t;
    return {
      ...t,
      score: t.score + score,
      jokerUsed: round.jokerActive ? true : t.jokerUsed,
    };
  });

  const history = [...state.history, result];
  const totalQuestions = getTotalQuestionCount(state.topics);
  const nextPhase = getNextPhaseAfterReview(totalQuestions, history, state.blitzTasks.length);

  // Create fresh round state for next round (or null for finale/blitz)
  const nextRound = nextPhase === "round-captain"
    ? createNextRoundState(round.teamId)
    : null;

  useGameStore.getState().setState({
    phase: nextPhase,
    currentRound: nextRound,
    history,
    teams,
    timer: nextPhase === "round-captain" ? createTimer(getCaptainTimerDuration()) : null,
    players: state.players.map((p) => ({ ...p, ready: false })),
  });
}

export function disputeReview(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-review" || !state.currentRound?.reviewResult) return;

  useGameStore.getState().setState({
    currentRound: {
      ...state.currentRound,
      reviewResult: { ...state.currentRound.reviewResult, score: 0 },
    },
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/actions/round.test.ts`
Expected: PASS — all 15 tests

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all tests (existing + new)

- [ ] **Step 6: Commit**

```bash
git add src/store/actions/round.ts src/store/actions/round.test.ts
git commit -m "feat: add round store actions — captain, question, answer, review, scoring"
```

---

### Task 7: Hook — useCountdown

**Files:**
- Create: `src/hooks/useCountdown.ts`

- [ ] **Step 1: Implement useCountdown hook**

```ts
import { useState, useEffect, useCallback, useImperativeHandle, useRef, type Ref } from "react";

export interface CountdownHandle {
  setTime(remaining: number): void;
}

export interface CountdownResult {
  remaining: number;
  progress: number;
  isWarning: boolean;
  formatted: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useCountdown(
  time: number,
  warningTime: number = 10,
  ref?: Ref<CountdownHandle>,
): CountdownResult {
  const [remaining, setRemaining] = useState(time);
  const totalRef = useRef(time);

  // Reset when time prop changes
  useEffect(() => {
    setRemaining(time);
    totalRef.current = time;
  }, [time]);

  // Tick every second
  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining > 0]);

  // Imperative handle for host sync
  useImperativeHandle(ref, () => ({
    setTime(newRemaining: number) {
      setRemaining(Math.max(0, newRemaining));
    },
  }), []);

  const total = totalRef.current;
  const progress = total > 0 ? remaining / total : 0;
  const isWarning = remaining > 0 && remaining <= warningTime;

  return {
    remaining,
    progress,
    isWarning,
    formatted: formatTime(remaining),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useCountdown.ts
git commit -m "feat: add useCountdown hook with imperative sync handle"
```

---

### Task 8: Component — Timer + stories

**Files:**
- Create: `src/components/Timer/Timer.tsx`
- Create: `src/components/Timer/Timer.module.css`
- Create: `src/components/Timer/Timer.stories.tsx`

- [ ] **Step 1: Create Timer.module.css**

```css
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
}

.ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring svg {
  transform: rotate(-90deg);
}

.trackCircle {
  fill: none;
  stroke: var(--color-border);
  stroke-width: 6;
}

.progressCircle {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear, stroke 0.3s;
}

.warning .progressCircle {
  stroke: var(--color-error);
}

.time {
  position: absolute;
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-text);
}

.warning .time {
  color: var(--color-error);
  animation: pulse 1s ease-in-out infinite;
}

.children {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 2: Create Timer.tsx**

```tsx
import { type Ref, type ReactNode } from "react";
import cn from "classnames";
import { useCountdown, type CountdownHandle } from "@/hooks/useCountdown";
import styles from "./Timer.module.css";

export interface TimerProps {
  time: number;
  warningTime?: number;
  ref?: Ref<CountdownHandle>;
  children?: ReactNode;
}

const SIZE = 120;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Timer({ time, warningTime = 10, ref, children }: TimerProps) {
  const { formatted, progress, isWarning } = useCountdown(time, warningTime, ref);
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  return (
    <div className={cn(styles.container, { [styles.warning]: isWarning })}>
      <div className={styles.ring}>
        <svg width={SIZE} height={SIZE}>
          <circle className={styles.trackCircle} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
          <circle
            className={styles.progressCircle}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className={styles.time}>{formatted}</span>
      </div>
      {children && <div className={styles.children}>{children}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Create Timer.stories.tsx**

```tsx
import type { Story } from "@ladle/react";
import { Timer } from "./Timer";

export const Default: Story = () => <Timer time={60}>Выбор капитана</Timer>;
export const Short: Story = () => <Timer time={20}>Ответы</Timer>;
export const Warning: Story = () => <Timer time={8} warningTime={10}>Осталось мало!</Timer>;
export const Expired: Story = () => <Timer time={0}>Время вышло</Timer>;
```

- [ ] **Step 4: Run type check and verify stories**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Timer/
git commit -m "feat: add Timer component with SVG ring and countdown"
```

---

### Task 9: Component — TimerButton + stories

**Files:**
- Create: `src/components/TimerButton/TimerButton.tsx`
- Create: `src/components/TimerButton/TimerButton.module.css`
- Create: `src/components/TimerButton/TimerButton.stories.tsx`

- [ ] **Step 1: Create TimerButton.module.css**

```css
.button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  width: 100%;
  transition: opacity var(--duration-all);
}

.button:disabled {
  opacity: 0.5;
  cursor: default;
}

.time {
  font-family: var(--font-display);
  font-weight: 700;
  min-width: 60px;
  text-align: right;
}

.warning .time {
  color: #ffcdd2;
  animation: pulse 1s ease-in-out infinite;
}

.progressBar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.4);
  transition: width 1s linear;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 2: Create TimerButton.tsx**

```tsx
import { type Ref, type ReactNode } from "react";
import cn from "classnames";
import { useCountdown, type CountdownHandle } from "@/hooks/useCountdown";
import styles from "./TimerButton.module.css";

export interface TimerButtonProps {
  time: number;
  warningTime?: number;
  ref?: Ref<CountdownHandle>;
  onClick?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function TimerButton({ time, warningTime = 10, ref, onClick, disabled, children }: TimerButtonProps) {
  const { formatted, progress, isWarning } = useCountdown(time, warningTime, ref);

  return (
    <button
      className={cn(styles.button, { [styles.warning]: isWarning })}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
      <span className={styles.time}>{formatted}</span>
      <div className={styles.progressBar} style={{ width: `${progress * 100}%` }} />
    </button>
  );
}
```

- [ ] **Step 3: Create TimerButton.stories.tsx**

```tsx
import type { Story } from "@ladle/react";
import { TimerButton } from "./TimerButton";

export const Default: Story = () => (
  <TimerButton time={60} onClick={() => console.log("click")}>
    Буду капитаном!
  </TimerButton>
);
export const Warning: Story = () => (
  <TimerButton time={5} warningTime={10}>Торопитесь!</TimerButton>
);
export const Disabled: Story = () => (
  <TimerButton time={30} disabled>Заблокировано</TimerButton>
);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TimerButton/
git commit -m "feat: add TimerButton component with progress bar"
```

---

### Task 10: Component — TimerInput + stories

**Files:**
- Create: `src/components/TimerInput/TimerInput.tsx`
- Create: `src/components/TimerInput/TimerInput.module.css`
- Create: `src/components/TimerInput/TimerInput.stories.tsx`

- [ ] **Step 1: Create TimerInput.module.css**

```css
.wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg);
  overflow: hidden;
}

.wrapper:focus-within {
  border-color: var(--color-primary);
}

.input {
  flex: 1;
  border: none;
  outline: none;
  font-size: var(--font-size-lg);
  background: transparent;
  color: var(--color-text);
  font-family: inherit;
}

.time {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  min-width: 50px;
  text-align: right;
}

.warning .time {
  color: var(--color-error);
  animation: pulse 1s ease-in-out infinite;
}

.progressBar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: var(--color-primary);
  transition: width 1s linear;
}

.warning .progressBar {
  background: var(--color-error);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

- [ ] **Step 2: Create TimerInput.tsx**

```tsx
import { type Ref, type InputHTMLAttributes } from "react";
import cn from "classnames";
import { useCountdown, type CountdownHandle } from "@/hooks/useCountdown";
import styles from "./TimerInput.module.css";

export interface TimerInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "ref"> {
  time: number;
  warningTime?: number;
  ref?: Ref<CountdownHandle>;
}

export function TimerInput({ time, warningTime = 10, ref, className, ...inputProps }: TimerInputProps) {
  const { formatted, progress, isWarning } = useCountdown(time, warningTime, ref);

  return (
    <div className={cn(styles.wrapper, { [styles.warning]: isWarning }, className)}>
      <input className={styles.input} {...inputProps} />
      <span className={styles.time}>{formatted}</span>
      <div className={styles.progressBar} style={{ width: `${progress * 100}%` }} />
    </div>
  );
}
```

- [ ] **Step 3: Create TimerInput.stories.tsx**

```tsx
import { useState } from "react";
import type { Story } from "@ladle/react";
import { TimerInput } from "./TimerInput";

export const Default: Story = () => {
  const [value, setValue] = useState("");
  return (
    <TimerInput
      time={60}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Введите ответ..."
    />
  );
};
export const Warning: Story = () => <TimerInput time={5} warningTime={10} placeholder="Скорее!" />;
export const Disabled: Story = () => <TimerInput time={30} disabled placeholder="Отключено" />;
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TimerInput/
git commit -m "feat: add TimerInput component with progress bar"
```

---

### Task 11: Component — JokerState + stories

**Files:**
- Create: `src/components/JokerState/JokerState.tsx`
- Create: `src/components/JokerState/JokerState.module.css`
- Create: `src/components/JokerState/JokerState.stories.tsx`

- [ ] **Step 1: Create JokerState.module.css**

```css
.card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  border: 2px solid var(--color-border);
  background: var(--color-bg);
  transition: all var(--duration-all);
}

.enabled {
  cursor: pointer;
  border-color: var(--color-warning);
  background: var(--color-bg);
}

.enabled:hover {
  background: var(--color-bg-secondary);
  box-shadow: var(--shadow-md);
}

.disabled {
  opacity: 0.5;
  cursor: default;
  border-color: var(--color-border);
}

.active {
  border-color: var(--color-warning);
  background: var(--color-warning);
  color: white;
  animation: glowPulse 2s ease-in-out infinite;
}

.icon {
  font-size: 2rem;
}

.text {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: var(--font-size-md);
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 8px rgba(251, 140, 0, 0.4); }
  50% { box-shadow: 0 0 20px rgba(251, 140, 0, 0.8); }
}
```

- [ ] **Step 2: Create JokerState.tsx**

```tsx
import { useTranslation } from "react-i18next";
import cn from "classnames";
import styles from "./JokerState.module.css";

export interface JokerStateProps {
  state: "enabled" | "disabled" | "active";
  onClick?: () => void;
}

export function JokerState({ state, onClick }: JokerStateProps) {
  const { t } = useTranslation();

  const textMap = {
    enabled: t("joker.use"),
    disabled: t("joker.used"),
    active: t("joker.active"),
  };

  return (
    <div
      className={cn(styles.card, styles[state])}
      onClick={state === "enabled" ? onClick : undefined}
    >
      <span className={styles.icon}>🃏</span>
      <span className={styles.text}>{textMap[state]}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create JokerState.stories.tsx**

```tsx
import type { Story } from "@ladle/react";
import { JokerState } from "./JokerState";

export const Enabled: Story = () => <JokerState state="enabled" onClick={() => console.log("joker!")} />;
export const Disabled: Story = () => <JokerState state="disabled" />;
export const Active: Story = () => <JokerState state="active" />;
```

- [ ] **Step 4: Commit**

```bash
git add src/components/JokerState/
git commit -m "feat: add JokerState component — enabled, disabled, active states"
```

---

### Task 12: Component — TeamScore + stories

**Files:**
- Create: `src/components/TeamScore/TeamScore.tsx`
- Create: `src/components/TeamScore/TeamScore.module.css`
- Create: `src/components/TeamScore/TeamScore.stories.tsx`

- [ ] **Step 1: Create TeamScore.module.css**

```css
.container {
  display: flex;
  gap: var(--spacing-sm);
}

.team {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-xl);
  transition: all 0.3s ease;
}

.red { background: var(--color-team-red-light); color: var(--color-team-red); }
.blue { background: var(--color-team-blue-light); color: var(--color-team-blue); }
.none { background: var(--color-team-neutral-light); color: var(--color-team-none); }

.leader {
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.15);
}

.score {
  transition: all 0.3s ease;
}

.coin {
  font-size: var(--font-size-md);
}
```

- [ ] **Step 2: Create TeamScore.tsx**

```tsx
import cn from "classnames";
import type { TeamColor } from "@/types/game";
import styles from "./TeamScore.module.css";

export interface TeamScoreProps {
  teams: Array<{ id: string; color: TeamColor; score: number }>;
}

export function TeamScore({ teams }: TeamScoreProps) {
  const maxScore = Math.max(...teams.map((t) => t.score));
  const hasLeader = teams.length > 1 && teams.filter((t) => t.score === maxScore).length === 1;

  return (
    <div className={styles.container}>
      {teams.map((team) => (
        <div
          key={team.id}
          className={cn(
            styles.team,
            styles[team.color],
            { [styles.leader]: hasLeader && team.score === maxScore },
          )}
        >
          <span className={styles.score}>{team.score}</span>
          <span className={styles.coin}>🪙</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create TeamScore.stories.tsx**

```tsx
import type { Story } from "@ladle/react";
import { TeamScore } from "./TeamScore";

export const SingleTeam: Story = () => (
  <TeamScore teams={[{ id: "red", color: "red", score: 450 }]} />
);
export const DualEqual: Story = () => (
  <TeamScore teams={[
    { id: "red", color: "red", score: 300 },
    { id: "blue", color: "blue", score: 300 },
  ]} />
);
export const DualLeader: Story = () => (
  <TeamScore teams={[
    { id: "red", color: "red", score: 500 },
    { id: "blue", color: "blue", score: 320 },
  ]} />
);
export const Zero: Story = () => (
  <TeamScore teams={[{ id: "red", color: "red", score: 0 }]} />
);
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TeamScore/
git commit -m "feat: add TeamScore component with leader highlight"
```

---

### Task 13: Component — ScoreFormula

**Files:**
- Create: `src/components/ScoreFormula/ScoreFormula.tsx`
- Create: `src/components/ScoreFormula/ScoreFormula.module.css`

- [ ] **Step 1: Create ScoreFormula.module.css**

```css
.formula {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: 700;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.total {
  color: var(--color-success);
}
```

- [ ] **Step 2: Create ScoreFormula.tsx**

```tsx
import styles from "./ScoreFormula.module.css";

export interface ScoreFormulaProps {
  difficulty: number;
  correctCount: number;
  jokerActive: boolean;
  bonusMultiplier: number;
  totalScore: number;
}

export function ScoreFormula({ difficulty, correctCount, jokerActive, bonusMultiplier, totalScore }: ScoreFormulaProps) {
  if (correctCount === 0) {
    return <div className={styles.formula}><span className={styles.total}>0 🪙</span></div>;
  }

  const parts: string[] = [];
  parts.push(`( ${difficulty}🪙 × ${correctCount} )`);
  if (jokerActive) parts.push("× 2🃏");
  if (bonusMultiplier > 0) parts.push(`× ${bonusMultiplier.toFixed(1)}⌚`);

  return (
    <div className={styles.formula}>
      <span>{parts.join(" ")}</span>
      <span> = </span>
      <span className={styles.total}>{totalScore} 🪙</span>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ScoreFormula/
git commit -m "feat: add ScoreFormula component with emoji markers"
```

---

### Task 14: StickerStack — drag-n-drop

**Files:**
- Modify: `src/components/StickerStack/StickerStack.tsx`
- Modify: `src/components/StickerStack/StickerStack.module.css`
- Modify: `src/components/StickerStack/StickerStack.stories.tsx`

- [ ] **Step 1: Update StickerStack.tsx with drag-n-drop**

Add new props and always render `.stack` wrapper. In `src/components/StickerStack/StickerStack.tsx`, replace the full file:

```tsx
import { useState, type ComponentProps, useMemo, type DragEvent } from "react";
import cn from "classnames";
import { Sticker } from "@/components/Sticker/Sticker";
import styles from "./StickerStack.module.css";

export interface StickerStackProps {
  stickers: ComponentProps<typeof Sticker>[];
  onClickBadge?: (index: number) => void;
  onClickSticker?: () => void;
  draggable?: boolean;
  dragData?: string;
  onDrop?: (dragData: string) => void;
}

export function StickerStack({ stickers, onClickBadge, onClickSticker, draggable, dragData, onDrop }: StickerStackProps) {
  const [topIndex, setTopIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropOver, setIsDropOver] = useState(false);

  if (stickers.length === 0) return null;

  function handleDragStart(e: DragEvent) {
    if (!dragData) return;
    e.dataTransfer.setData("text/plain", dragData);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  function handleDragOver(e: DragEvent) {
    if (!onDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDropOver(true);
  }

  function handleDragLeave() {
    setIsDropOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDropOver(false);
    const data = e.dataTransfer.getData("text/plain");
    if (data && data !== dragData) {
      onDrop?.(data);
    }
  }

  if (stickers.length === 1) {
    return (
      <div
        className={cn(styles.stack, styles.single)}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        data-drop-over={isDropOver || undefined}
      >
        <Sticker {...stickers[0]} onClickSticker={onClickSticker} />
      </div>
    );
  }

  const current = stickers[topIndex % stickers.length];

  function handleCycle() {
    setTopIndex((i) => (i + 1) % stickers.length);
  }

  function handleBadgeClick() {
    onClickBadge?.(topIndex);
  }

  const nextBgStickers = useMemo(() => {
    return [...stickers, ...stickers].slice(topIndex, topIndex + Math.min(stickers.length - 1, 2));
  }, [stickers, topIndex]);

  return (
    <div
      className={styles.stack}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-dragging={isDragging || undefined}
      data-drop-over={isDropOver || undefined}
    >
      {nextBgStickers.map((stickerProps, i) => (
        <div key={i} className={styles.backdrop}>
          <Sticker {...stickerProps} hideAvatar />
        </div>
      ))}
      <div className={styles.top}>
        <Sticker key={topIndex} {...current} onClickAvatar={handleCycle} onClickSticker={onClickSticker} />
      </div>
      <div className={styles.badge} onClick={handleBadgeClick}>
        {stickers.length}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add drag-n-drop CSS**

Append to `src/components/StickerStack/StickerStack.module.css`:

```css
.single {
  position: relative;
}

.stack[data-dragging] {
  opacity: 0.5;
}

.stack[data-drop-over] {
  outline: 2px dashed var(--color-primary);
  outline-offset: 4px;
  border-radius: var(--radius-sm);
}
```

- [ ] **Step 3: Add drag-n-drop story**

Append to `src/components/StickerStack/StickerStack.stories.tsx`:

```tsx
export const DragAndDrop: Story = () => {
  const [groups, setGroups] = useState([
    [{ player: { emoji: "😈", name: "Alice", team: "red" as const }, answerText: "Кошка" }],
    [{ player: { emoji: "👹", name: "Bob", team: "red" as const }, answerText: "Кот" }],
    [{ player: { emoji: "👺", name: "Carol", team: "red" as const }, answerText: "Собака" }],
  ]);

  function handleDrop(targetIdx: number, sourceData: string) {
    const sourceIdx = groups.findIndex((_, i) => String(i) === sourceData);
    if (sourceIdx === -1 || sourceIdx === targetIdx) return;
    setGroups((prev) => {
      const merged = [...prev[targetIdx], ...prev[sourceIdx]];
      return prev.filter((_, i) => i !== sourceIdx && i !== targetIdx).concat([merged]);
    });
  }

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {groups.map((group, i) => (
        <StickerStack
          key={i}
          stickers={group}
          draggable
          dragData={String(i)}
          onDrop={(data) => handleDrop(i, data)}
          onClickSticker={() => console.log("toggle", i)}
        />
      ))}
    </div>
  );
};
```

Add `import { useState } from "react";` at the top of the stories file if not present.

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/StickerStack/
git commit -m "feat: add drag-n-drop to StickerStack — merge and drop target"
```

---

### Task 15: i18n keys

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add round/joker/score keys to ru.json**

Add the following keys after the `"team"` section:

```json
"round": {
  "captain": "Выбор капитана",
  "captainHint": "Нажмите, чтобы стать капитаном",
  "beCaptain": "Буду капитаном!",
  "pick": "Выбор вопроса",
  "pickHint": "Капитан выбирает вопрос...",
  "ready": "Подготовка",
  "readyBtn": "Я готов",
  "readyCount": "Готовы: {{count}}/{{total}}",
  "active": "Раунд",
  "activeHint": "Объясняйте жестами!",
  "answeredCount": "Ответили: {{count}}/{{total}}",
  "answer": "Время на ответ",
  "answerHint": "Введите ответ",
  "giveUp": "Сдаюсь",
  "submit": "Отправить",
  "gaveUp": "Вы не дали ответ",
  "review": "Итоги раунда",
  "next": "Далее",
  "dispute": "Оспорить",
  "nextRound": "Следующий раунд"
},
"joker": {
  "use": "Использовать джокер (×2)",
  "used": "Джокер использован",
  "active": "Джокер активирован! ×2"
},
"score": {
  "total": "Итого"
}
```

- [ ] **Step 2: Add round/joker/score keys to en.json**

Add the same structure in English:

```json
"round": {
  "captain": "Captain Selection",
  "captainHint": "Press to become captain",
  "beCaptain": "I'll be captain!",
  "pick": "Question Selection",
  "pickHint": "Captain is choosing a question...",
  "ready": "Preparation",
  "readyBtn": "I'm ready",
  "readyCount": "Ready: {{count}}/{{total}}",
  "active": "Round",
  "activeHint": "Explain with gestures!",
  "answeredCount": "Answered: {{count}}/{{total}}",
  "answer": "Answer time",
  "answerHint": "Enter your answer",
  "giveUp": "Give up",
  "submit": "Submit",
  "gaveUp": "You didn't answer",
  "review": "Round Results",
  "next": "Next",
  "dispute": "Dispute",
  "nextRound": "Next Round"
},
"joker": {
  "use": "Use joker (×2)",
  "used": "Joker used",
  "active": "Joker activated! ×2"
},
"score": {
  "total": "Total"
}
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/ru.json src/i18n/en.json
git commit -m "feat: add i18n keys for round phases, joker, scoring"
```

---

### Task 16: HostRound + styles

**Files:**
- Create: `src/pages/round/HostRound.tsx`
- Create: `src/pages/round/HostRound.module.css`

- [ ] **Step 1: Create HostRound.module.css**

```css
.layout {
  min-height: 100vh;
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.sidebar {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.stickersGrid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.stickerSlot {
  width: 200px;
}

.actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.actionBtn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
  transition: opacity var(--duration-all);
}

.primaryBtn {
  composes: actionBtn;
  background: var(--color-success);
  color: white;
}

.secondaryBtn {
  composes: actionBtn;
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.phaseInfo {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
}
```

- [ ] **Step 2: Create HostRound.tsx**

```tsx
import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/gameStore";
import { usePhase, useCurrentRound, useTeams, usePlayers, useTimer as useTimerState } from "@/store/selectors";
import { getPlayedQuestionIndices, getTotalQuestionCount } from "@/logic/phaseTransitions";
import { toLinearQuestionIndex } from "@/store/selectors";
import {
  handleTimerExpire,
  initReview,
  evaluateAnswer,
  mergeAnswerGroups,
  splitAnswerFromGroup,
  confirmReview,
  disputeReview,
  selectQuestion,
  activateJoker,
} from "@/store/actions/round";
import { getRemainingTime } from "@/logic/timer";
import { Timer } from "@/components/Timer/Timer";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "@/components/TaskView/TaskView";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { JokerState } from "@/components/JokerState/JokerState";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import { ScoreFormula } from "@/components/ScoreFormula/ScoreFormula";
import { StickerStack } from "@/components/StickerStack/StickerStack";
import { TeamGroup } from "@/components/TeamGroup/TeamGroup";
import { PlayerStatusTable } from "@/components/PlayerStatusTable/PlayerStatusTable";
import type { GameState, RoundPhase, TeamColor } from "@/types/game";
import styles from "./HostRound.module.css";

export function HostRound() {
  const { t } = useTranslation();
  const phase = usePhase() as RoundPhase;
  const round = useCurrentRound();
  const teams = useTeams();
  const players = usePlayers();
  const timerState = useTimerState();
  const state = useGameStore.getState();
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  if (!round) return null;

  const teamPlayers = players.filter((p) => p.team === round.teamId);
  const team = teams.find((t) => t.id === round.teamId);
  const timerRemaining = timerState ? getRemainingTime(timerState) : 0;
  const played = getPlayedQuestionIndices(state.history);

  // Build TaskView data
  const taskViewTopics: TaskViewTopic[] = state.topics.map((topic, ti) => ({
    name: topic.name,
    questions: topic.questions.map((q, qi) => {
      const linear = toLinearQuestionIndex(state, ti, qi);
      const result = state.history.find((h) => h.type === "round" && h.questionIndex === linear);
      return {
        open: !!result,
        active: round.questionIndex === linear,
        difficulty: q.difficulty,
        totalScore: result?.score,
        jokerUsed: result?.jokerUsed ?? false,
      };
    }),
  }));

  const taskViewBlitz: TaskViewBlitz[] = state.blitzTasks.map(() => ({ active: false }));

  // Get current question info
  let questionTopic = "";
  let questionText = "";
  let questionDifficulty = 100;
  if (round.questionIndex != null) {
    let remaining = round.questionIndex;
    for (const topic of state.topics) {
      if (remaining < topic.questions.length) {
        questionTopic = topic.name;
        questionText = topic.questions[remaining].text;
        questionDifficulty = topic.questions[remaining].difficulty;
        break;
      }
      remaining -= topic.questions.length;
    }
  }

  const captain = players.find((p) => p.name === round.captainName);
  const respondersCount = teamPlayers.length - 1;
  const answeredCount = Object.keys(round.answers).length;

  // Stickers for review
  const reviewGroups = round.reviewResult?.groups ?? [];
  const reviewEvals = round.reviewResult?.evaluations ?? [];

  function getJokerState(): "enabled" | "disabled" | "active" {
    if (round!.jokerActive) return "active";
    if (team?.jokerUsed) return "disabled";
    return "enabled";
  }

  const phaseText: Record<RoundPhase, string> = {
    "round-captain": t("round.captain"),
    "round-pick": t("round.pick"),
    "round-ready": t("round.ready"),
    "round-active": t("round.active"),
    "round-answer": t("round.answer"),
    "round-review": t("round.review"),
  };

  const showQuestion = phase === "round-review" && reviewConfirmed;

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        {/* round-captain / round-pick: TaskView + JokerState */}
        {(phase === "round-captain" || phase === "round-pick") && (
          <>
            <TaskView
              topics={taskViewTopics}
              blitzRounds={taskViewBlitz}
              onSelectQuestion={phase === "round-pick" ? (ti, qi) => {
                const linear = toLinearQuestionIndex(state, ti, qi);
                if (!played.includes(linear)) selectQuestion(linear);
              } : undefined}
            />
            <JokerState
              state={phase === "round-pick" ? getJokerState() : "disabled"}
              onClick={() => activateJoker()}
            />
          </>
        )}

        {/* round-ready through round-review: TaskCard */}
        {phase !== "round-captain" && phase !== "round-pick" && (
          <TaskCard
            topic={questionTopic}
            player={captain}
            difficulty={questionDifficulty}
            questionScore={showQuestion ? questionText : "* * * * *"}
            hidden={!showQuestion}
          />
        )}

        {/* round-active / round-answer / round-review: Stickers */}
        {(phase === "round-active" || phase === "round-answer") && (
          <>
            <div className={styles.stickersGrid}>
              {Object.entries(round.answers).map(([name]) => {
                const player = players.find((p) => p.name === name);
                return (
                  <div key={name} className={styles.stickerSlot}>
                    <StickerStack
                      stickers={[{
                        player: player ?? { emoji: "?", name, team: "none" as TeamColor },
                        answerText: "• • •",
                      }]}
                    />
                  </div>
                );
              })}
            </div>
            <div className={styles.phaseInfo}>
              {t("round.answeredCount", { count: answeredCount, total: respondersCount })}
            </div>
          </>
        )}

        {/* round-review: evaluation phase */}
        {phase === "round-review" && !reviewConfirmed && (
          <>
            <div className={styles.stickersGrid}>
              {reviewGroups.map((group, gi) => {
                const stickerProps = group.map((name) => {
                  const player = players.find((p) => p.name === name);
                  const answer = round.answers[name];
                  const evaluation = reviewEvals.find((e) => e.playerName === name);
                  return {
                    player: player ?? { emoji: "?", name, team: "none" as TeamColor },
                    answerText: answer?.text || t("round.gaveUp"),
                    stampText: evaluation?.correct === true ? "+✓" : evaluation?.correct === false ? "✗" : undefined,
                    stampColor: (evaluation?.correct === true ? "green" : "red") as "green" | "red",
                  };
                });
                return (
                  <div key={gi} className={styles.stickerSlot}>
                    <StickerStack
                      stickers={stickerProps}
                      draggable
                      dragData={group[0]}
                      onDrop={(sourcePlayer) => mergeAnswerGroups(sourcePlayer, group[0])}
                      onClickSticker={() => {
                        const name = group[0];
                        const evaluation = reviewEvals.find((e) => e.playerName === name);
                        const newCorrect = evaluation?.correct === true ? false : true;
                        group.forEach((n) => evaluateAnswer(n, newCorrect));
                      }}
                      onClickBadge={() => {
                        if (group.length > 1) splitAnswerFromGroup(group[group.length - 1]);
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className={styles.actions}>
              <button className={styles.primaryBtn} onClick={() => { confirmReview(); setReviewConfirmed(true); }}>
                {t("round.next")}
              </button>
            </div>
          </>
        )}

        {/* round-review: score display phase */}
        {phase === "round-review" && reviewConfirmed && round.reviewResult && (
          <>
            <ScoreFormula
              difficulty={questionDifficulty}
              correctCount={reviewEvals.filter((e) => e.correct === true).length}
              jokerActive={round.jokerActive}
              bonusMultiplier={round.reviewResult.score > 0 ? 0 : 0}
              totalScore={round.reviewResult.score}
            />
            <div className={styles.actions}>
              <button className={styles.secondaryBtn} onClick={() => { disputeReview(); setReviewConfirmed(false); }}>
                {t("round.dispute")}
              </button>
              <button className={styles.primaryBtn} onClick={() => { confirmReview(); setReviewConfirmed(false); }}>
                {t("round.nextRound")}
              </button>
            </div>
          </>
        )}
      </div>

      <div className={styles.sidebar}>
        <TeamScore teams={teams.map((t) => ({ id: t.id, color: t.color, score: t.score }))} />
        <Timer time={timerRemaining}>{phaseText[phase]}</Timer>
        {teams.map((tm) => (
          <TeamGroup key={tm.id} team={tm}>
            <PlayerStatusTable
              players={teamPlayers.map((p) => ({
                emoji: p.emoji,
                name: p.name,
                team: p.team,
                online: p.online,
                roleIcon: p.name === round.captainName ? "👑" : undefined,
                status: getPlayerStatus(phase, p.name, round),
              }))}
            />
          </TeamGroup>
        ))}
      </div>
    </div>
  );
}

function getPlayerStatus(
  phase: RoundPhase,
  playerName: string,
  round: NonNullable<GameState["currentRound"]>,
): string | undefined {
  const isCaptain = round.captainName === playerName;
  if (isCaptain) return undefined;

  const answer = round.answers[playerName];
  const evaluation = round.reviewResult?.evaluations.find((e) => e.playerName === playerName);

  switch (phase) {
    case "round-captain":
    case "round-pick":
      return "⏳";
    case "round-ready":
      return undefined; // ready status comes from player.ready
    case "round-active":
      if (!answer) return "✏️";
      return answer.text === "" ? "❌" : "✔️";
    case "round-answer":
      if (!answer) return "✏️";
      if (answer.text === "") return "❌";
      if (evaluation?.correct === true) return "✅";
      if (evaluation?.correct === false) return "❌";
      return "✔️";
    case "round-review":
      if (evaluation?.correct === true) return "✅";
      if (evaluation?.correct === false) return "❌";
      return undefined;
    default:
      return undefined;
  }
}
```

> **Note:** This is a first working version. The `TeamGroup` and `PlayerStatusTable` component APIs may need minor adjustments — check their actual props during implementation and adapt. The `reviewConfirmed` local state tracks whether the host is in evaluation or score-display sub-phase.

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (fix any import issues)

- [ ] **Step 4: Commit**

```bash
git add src/pages/round/
git commit -m "feat: add HostRound — 6 sub-phase host layout with evaluation"
```

---

### Task 17: PlayerRound + styles

**Files:**
- Create: `src/pages/round/PlayerRound.tsx`
- Create: `src/pages/round/PlayerRound.module.css`

- [ ] **Step 1: Create PlayerRound.module.css**

```css
.container {
  min-height: 100vh;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  max-width: 480px;
  margin: 0 auto;
}

.phaseInfo {
  font-size: var(--font-size-md);
  color: var(--color-text-secondary);
  text-align: center;
}

.answerForm {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.answerActions {
  display: flex;
  gap: var(--spacing-sm);
}

.submitBtn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-success);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
}

.submitBtn:disabled {
  opacity: 0.5;
  cursor: default;
}

.giveUpBtn {
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  cursor: pointer;
}

.readyBtn {
  padding: var(--spacing-md);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-lg);
  font-weight: 600;
  cursor: pointer;
  width: 100%;
}

.reviewActions {
  display: flex;
  gap: var(--spacing-sm);
}

.reviewBtn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-md);
  font-weight: 600;
  cursor: pointer;
}

.disputeBtn {
  composes: reviewBtn;
  background: var(--color-bg-secondary);
  color: var(--color-text);
}

.nextBtn {
  composes: reviewBtn;
  background: var(--color-success);
  color: white;
}

.scoreDisplay {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  font-weight: 700;
  text-align: center;
  color: var(--color-success);
}
```

- [ ] **Step 2: Create PlayerRound.tsx**

```tsx
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePhase, useCurrentRound, usePlayers } from "@/store/selectors";
import { useGameStore } from "@/store/gameStore";
import { getQuestionByLinearIndex } from "@/store/selectors";
import { TimerButton } from "@/components/TimerButton/TimerButton";
import { TimerInput } from "@/components/TimerInput/TimerInput";
import { TaskCard } from "@/components/TaskCard/TaskCard";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "@/components/TaskView/TaskView";
import { JokerState } from "@/components/JokerState/JokerState";
import { Sticker } from "@/components/Sticker/Sticker";
import { toLinearQuestionIndex, getPlayedQuestionIndices } from "@/store/selectors";
import { getRemainingTime } from "@/logic/timer";
import type { PlayerAction, RoundPhase, TeamColor } from "@/types/game";
import styles from "./PlayerRound.module.css";

interface PlayerRoundProps {
  playerName: string;
  sendAction: (action: PlayerAction) => void;
}

export function PlayerRound({ playerName, sendAction }: PlayerRoundProps) {
  const { t } = useTranslation();
  const phase = usePhase() as RoundPhase;
  const round = useCurrentRound();
  const players = usePlayers();
  const state = useGameStore.getState();
  const timerState = useGameStore((s) => s.timer);
  const [answerText, setAnswerText] = useState("");

  if (!round) return null;

  const isCaptain = round.captainName === playerName;
  const myAnswer = round.answers[playerName];
  const hasAnswered = !!myAnswer;
  const gaveUp = hasAnswered && myAnswer.text === "";
  const timerRemaining = timerState ? getRemainingTime(timerState) : 0;
  const player = players.find((p) => p.name === playerName);

  // Question info
  let questionTopic = "";
  let questionText = "";
  let questionDifficulty = 100;
  if (round.questionIndex != null) {
    const info = getQuestionByLinearIndex(state, round.questionIndex);
    if (info) {
      questionTopic = info.topic.name;
      questionText = info.question.text;
      questionDifficulty = info.question.difficulty;
    }
  }

  const captain = players.find((p) => p.name === round.captainName);
  const showQuestionText = isCaptain && (phase === "round-active" || phase === "round-answer");
  const showQuestionInReview = phase === "round-review";

  // round-captain: everyone sees TimerButton
  if (phase === "round-captain") {
    return (
      <div className={styles.container}>
        <TimerButton
          time={timerRemaining}
          onClick={() => sendAction({ kind: "claim-captain" })}
        >
          {t("round.beCaptain")}
        </TimerButton>
        <div className={styles.phaseInfo}>{t("round.captainHint")}</div>
      </div>
    );
  }

  // round-pick
  if (phase === "round-pick") {
    if (isCaptain) {
      const played = getPlayedQuestionIndices(state.history);
      const taskViewTopics: TaskViewTopic[] = state.topics.map((topic, ti) => ({
        name: topic.name,
        questions: topic.questions.map((q, qi) => {
          const linear = toLinearQuestionIndex(state, ti, qi);
          const result = state.history.find((h) => h.type === "round" && h.questionIndex === linear);
          return { open: !!result, active: false, difficulty: q.difficulty, totalScore: result?.score, jokerUsed: result?.jokerUsed ?? false };
        }),
      }));
      const taskViewBlitz: TaskViewBlitz[] = state.blitzTasks.map(() => ({ active: false }));
      const team = state.teams.find((tm) => tm.id === round.teamId);

      return (
        <div className={styles.container}>
          <TaskView
            topics={taskViewTopics}
            blitzRounds={taskViewBlitz}
            onSelectQuestion={(ti, qi) => {
              const linear = toLinearQuestionIndex(state, ti, qi);
              if (!played.includes(linear)) sendAction({ kind: "select-question", questionIndex: linear });
            }}
          />
          <JokerState
            state={round.jokerActive ? "active" : team?.jokerUsed ? "disabled" : "enabled"}
            onClick={() => sendAction({ kind: "activate-joker" })}
          />
        </div>
      );
    }
    return (
      <div className={styles.container}>
        <div className={styles.phaseInfo}>{t("round.pickHint")}</div>
      </div>
    );
  }

  // round-ready
  if (phase === "round-ready") {
    return (
      <div className={styles.container}>
        <TaskCard
          topic={questionTopic}
          player={captain}
          difficulty={questionDifficulty}
          questionScore="* * * * *"
          hidden
        />
        <button
          className={styles.readyBtn}
          onClick={() => sendAction({ kind: "set-ready", ready: true })}
        >
          {t("round.readyBtn")}
        </button>
      </div>
    );
  }

  // round-active / round-answer
  if (phase === "round-active" || phase === "round-answer") {
    // Captain sees the question
    if (isCaptain) {
      return (
        <div className={styles.container}>
          <TaskCard
            topic={questionTopic}
            player={captain}
            difficulty={questionDifficulty}
            questionScore={questionText}
          />
          <div className={styles.phaseInfo}>{t("round.activeHint")}</div>
        </div>
      );
    }

    // Responder: answered or gave up
    if (hasAnswered) {
      if (gaveUp) {
        return (
          <div className={styles.container}>
            <TaskCard topic={questionTopic} player={captain} difficulty={questionDifficulty} questionScore="* * * * *" hidden />
            <div className={styles.phaseInfo}>{t("round.gaveUp")}</div>
          </div>
        );
      }
      return (
        <div className={styles.container}>
          <TaskCard topic={questionTopic} player={captain} difficulty={questionDifficulty} questionScore="* * * * *" hidden />
          <Sticker
            player={player ?? { emoji: "?", name: playerName, team: "none" as TeamColor }}
            answerText={myAnswer.text}
          />
        </div>
      );
    }

    // Responder: not answered yet — TimerInput
    return (
      <div className={styles.container}>
        <TaskCard topic={questionTopic} player={captain} difficulty={questionDifficulty} questionScore="* * * * *" hidden />
        <div className={styles.answerForm}>
          <TimerInput
            time={timerRemaining}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            placeholder={t("round.answerHint")}
          />
          <div className={styles.answerActions}>
            <button
              className={styles.submitBtn}
              disabled={!answerText.trim()}
              onClick={() => { sendAction({ kind: "submit-answer", text: answerText.trim() }); setAnswerText(""); }}
            >
              {t("round.submit")}
            </button>
            <button
              className={styles.giveUpBtn}
              onClick={() => sendAction({ kind: "submit-answer", text: "" })}
            >
              {t("round.giveUp")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // round-review
  if (phase === "round-review") {
    const reviewScore = round.reviewResult?.score ?? 0;
    const isScored = reviewScore > 0 || (round.reviewResult && round.reviewResult.evaluations.every((e) => e.correct !== null));

    return (
      <div className={styles.container}>
        <TaskCard
          topic={questionTopic}
          player={captain}
          difficulty={questionDifficulty}
          questionScore={questionText}
        />
        {hasAnswered && !gaveUp && (
          <Sticker
            player={player ?? { emoji: "?", name: playerName, team: "none" as TeamColor }}
            answerText={myAnswer.text}
            stampText={
              round.reviewResult?.evaluations.find((e) => e.playerName === playerName)?.correct === true ? "+✓"
              : round.reviewResult?.evaluations.find((e) => e.playerName === playerName)?.correct === false ? "✗"
              : undefined
            }
            stampColor={round.reviewResult?.evaluations.find((e) => e.playerName === playerName)?.correct === true ? "green" : "red"}
          />
        )}
        {isScored && (
          <>
            <div className={styles.scoreDisplay}>{reviewScore} 🪙</div>
            <div className={styles.reviewActions}>
              <button className={styles.disputeBtn} onClick={() => sendAction({ kind: "dispute-review" })}>
                {t("round.dispute")}
              </button>
              <button className={styles.nextBtn} onClick={() => sendAction({ kind: "next-round" })}>
                {t("round.nextRound")}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/round/PlayerRound.tsx src/pages/round/PlayerRound.module.css
git commit -m "feat: add PlayerRound — captain/responder views for all 6 phases"
```

---

### Task 18: PlayPage + useTransport integration

**Files:**
- Modify: `src/pages/PlayPage.tsx`
- Modify: `src/hooks/useTransport.ts`

- [ ] **Step 1: Update PlayPage.tsx — add round phase rendering**

In `src/pages/PlayPage.tsx`, add imports for HostRound and PlayerRound:

```ts
import { HostRound } from "@/pages/round/HostRound";
import { PlayerRound } from "@/pages/round/PlayerRound";
```

In the `HostPlay` component, after the lobby block, add round rendering:

```tsx
{phase.startsWith("round-") && <HostRound />}
```

In the `PlayerPlayConnected` component, after the lobby block, add:

```tsx
{phase.startsWith("round-") && (
  <PlayerRound playerName={playerName} sendAction={transport.sendAction} />
)}
```

- [ ] **Step 2: Update useTransport.ts — handle round actions**

In `src/hooks/useTransport.ts`, add imports:

```ts
import {
  claimCaptain,
  selectQuestion,
  activateJoker,
  submitAnswer,
  setPlayerReady,
  disputeReview,
  confirmReview,
} from "@/store/actions/round";
import { handleSetReady } from "@/store/actions/lobby";
```

In the `transport.onMessage` handler inside `useHostTransport`, after the `if (action.kind === "join")` block, add a switch for round actions:

```ts
switch (action.kind) {
  case "claim-captain":
    claimCaptain(peersRef.current.get(peerId) ?? "");
    break;
  case "select-question":
    selectQuestion(action.questionIndex);
    break;
  case "activate-joker":
    activateJoker();
    break;
  case "submit-answer":
    submitAnswer(peersRef.current.get(peerId) ?? "", action.text);
    break;
  case "set-ready": {
    const name = peersRef.current.get(peerId) ?? "";
    const state = useGameStore.getState();
    if (state.phase === "lobby") {
      handleSetReady(name, action.ready);
    } else if (state.phase === "round-ready") {
      setPlayerReady(name);
    }
    break;
  }
  case "dispute-review":
    disputeReview();
    break;
  case "next-round":
    confirmReview();
    break;
}
```

- [ ] **Step 3: Run type check and full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/pages/PlayPage.tsx src/hooks/useTransport.ts
git commit -m "feat: integrate round phases into PlayPage and useTransport"
```

---

### Task 19: Final verification

- [ ] **Step 1: Run full type check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: PASS — all tests (existing ~63 + new ~40 = ~103)

- [ ] **Step 3: Run build**

Run: `npx vite build`
Expected: PASS

- [ ] **Step 4: Verify Ladle stories**

Run: `npm run dev:storybook`
Check: Timer, TimerButton, TimerInput, JokerState, TeamScore, ScoreFormula, StickerStack (drag-n-drop) — all render correctly

- [ ] **Step 5: Update plan-01-init.md — mark Phase 6 tasks**

Mark completed items in `task/plan-01-init.md` under Phase 6.

- [ ] **Step 6: Final commit**

```bash
git add task/plan-01-init.md
git commit -m "docs: mark Phase 6 progress in plan"
```
