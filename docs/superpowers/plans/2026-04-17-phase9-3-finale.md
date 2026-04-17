# Phase 9.3: Finale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a presentation-only finale phase that displays final scores, winner announcement, and a carousel of data-driven player nominations.

**Architecture:** Extend `RoundResult` with per-player answer data collected during `confirmReview`/`confirmBlitzReview`. A pure function `computeNominations()` processes history into nominations. Host sees a scoreboard + auto-advancing carousel; player sees only the final score.

**Tech Stack:** React 19, TypeScript, CSS Modules, Zustand, i18next, Vitest, Ladle

---

### Task 1: Extend `RoundResult` type with player-level data

**Files:**
- Modify: `src/types/game.ts:130-139`

- [ ] **Step 1: Add `PlayerRoundResult` interface and extend `RoundResult`**

In `src/types/game.ts`, add `PlayerRoundResult` before `RoundResult` and extend `RoundResult` with new fields:

```typescript
export interface PlayerRoundResult {
  playerName: string;
  answerText: string;       // "" if player did not answer
  correct: boolean | null;  // true/false/null (not evaluated)
  answerTime: number;       // ms from timer start (Infinity if no answer)
  groupIndex: number;       // index in groups[] (-1 if not in a group)
}

export interface RoundResult {
  type: "round" | "blitz";
  teamId: TeamId;
  captainName: string;
  questionIndex?: number;
  blitzTaskIndex?: number;
  score: number;
  jokerUsed: boolean;
  // new fields for nominations
  playerResults: PlayerRoundResult[];
  difficulty: number;
  topicIndex: number;          // -1 for blitz
  bonusTimeApplied: boolean;
  bonusTime: number;
  bonusTimeMultiplier: number;
  groups: string[][];
}
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

Expected: Errors in `round.ts`, `blitz.ts`, and test files where `RoundResult` objects are constructed without the new required fields. This confirms the type extension works.

- [ ] **Step 3: Add helper `getTopicIndexForQuestion` to `src/logic/phaseTransitions.ts`**

Add at end of file:

```typescript
export function getTopicIndexForQuestion(
  questionIndex: number,
  topics: Topic[],
): number {
  let remaining = questionIndex;
  for (let i = 0; i < topics.length; i++) {
    if (remaining < topics[i]!.questions.length) return i;
    remaining -= topics[i]!.questions.length;
  }
  return -1;
}

export function getDifficultyForQuestion(
  questionIndex: number,
  topics: Topic[],
): number {
  let remaining = questionIndex;
  for (const topic of topics) {
    if (remaining < topic.questions.length) {
      return topic.questions[remaining]?.difficulty ?? 0;
    }
    remaining -= topic.questions.length;
  }
  return 0;
}
```

Add `import type { Topic } from "@/types/game";` to the imports if not already present.

- [ ] **Step 4: Commit**

```bash
git add src/types/game.ts src/logic/phaseTransitions.ts
git commit -m "feat(types): extend RoundResult with player-level data for nominations"
```

---

### Task 2: Update `confirmReview()` to populate extended `RoundResult`

**Files:**
- Modify: `src/store/actions/round.ts:361-394`
- Modify: `src/store/actions/round.test.ts`

- [ ] **Step 1: Update the test for `confirmReview` to expect new fields**

In `src/store/actions/round.test.ts`, update the `confirmReview` test (around line 299):

```typescript
describe("confirmReview", () => {
  it("calculates score, saves to history with player results, transitions", () => {
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
    const result = s.history[0]!;
    expect(result.score).toBe(100);
    expect(result.playerResults).toHaveLength(2);
    expect(result.playerResults[0]?.playerName).toBe("Bob");
    expect(result.playerResults[0]?.answerText).toBe("answer1");
    expect(result.playerResults[0]?.correct).toBe(true);
    expect(result.playerResults[0]?.groupIndex).toBe(0);
    expect(result.playerResults[1]?.playerName).toBe("Carol");
    expect(result.difficulty).toBe(100);
    expect(result.topicIndex).toBe(0);
    expect(result.groups).toEqual([["Bob", "Carol"]]);
    expect(result.bonusTimeApplied).toBe(false);
    expect(s.teams[0]?.score).toBe(100);
    expect(s.phase).toBe("round-captain");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/actions/round.test.ts -t "confirmReview"`

Expected: FAIL — `result.playerResults` is undefined.

- [ ] **Step 3: Update `confirmReview()` in `src/store/actions/round.ts`**

Import the new helpers at the top of the file:

```typescript
import { getPlayedQuestionIndices, getNextPhaseAfterReview, createNextRoundState, createNextBlitzRoundState, getTotalQuestionCount, getTopicIndexForQuestion, getDifficultyForQuestion } from "@/logic/phaseTransitions";
import type { AnswerEvaluation, PlayerRoundResult, RoundPhase, RoundState, TimerState } from "@/types/game";
```

Replace the `confirmReview` function (lines 361-394):

```typescript
export function confirmReview(): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-result" || !state.currentRound?.reviewResult) return;

  const review = state.currentRound.reviewResult;
  const round = state.currentRound;
  const score = review.score;

  const playerResults: PlayerRoundResult[] = review.evaluations.map((ev) => {
    const answer = round.answers[ev.playerName];
    const groupIndex = review.groups.findIndex((g) => g.includes(ev.playerName));
    return {
      playerName: ev.playerName,
      answerText: answer?.text ?? "",
      correct: ev.correct,
      answerTime: answer ? answer.timestamp - round.activeTimerStartedAt : Infinity,
      groupIndex,
    };
  });

  const questionIndex = round.questionIndex ?? 0;
  const difficulty = getDifficultyForQuestion(questionIndex, state.topics);
  const topicIndex = getTopicIndexForQuestion(questionIndex, state.topics);

  const result = {
    type: "round" as const,
    teamId: round.teamId,
    captainName: round.captainName,
    questionIndex: round.questionIndex,
    score,
    jokerUsed: round.jokerActive,
    playerResults,
    difficulty,
    topicIndex,
    bonusTimeApplied: review.bonusTimeApplied,
    bonusTime: review.bonusTime,
    bonusTimeMultiplier: review.bonusTimeMultiplier,
    groups: review.groups,
  };

  const teams = state.teams.map((t) => {
    if (t.id !== round.teamId) return t;
    return {
      ...t,
      score: t.score + score,
      jokerUsed: round.jokerActive ? true : t.jokerUsed,
    };
  });

  const history = [...state.history, result];
  
  useGameStore.getState().setState({
    history,
    teams
  });
  goToNextRound();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/actions/round.test.ts -t "confirmReview"`

Expected: PASS

- [ ] **Step 5: Fix all other tests that construct `RoundResult` without new fields**

Search for `RoundResult` constructions in test files and add default values for the new fields:

```typescript
// Add these defaults wherever a RoundResult is created in tests:
playerResults: [],
difficulty: 100,
topicIndex: 0,
bonusTimeApplied: false,
bonusTime: 0,
bonusTimeMultiplier: 1,
groups: [],
```

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`

Expected: All tests pass. Type check also passes: `npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add src/store/actions/round.ts src/store/actions/round.test.ts src/logic/phaseTransitions.ts
git commit -m "feat(round): populate extended RoundResult with player data in confirmReview"
```

---

### Task 3: Update `confirmBlitzReview()` to populate extended `RoundResult`

**Files:**
- Modify: `src/store/actions/blitz.ts:320-349`
- Modify: `src/store/actions/blitz.test.ts`

- [ ] **Step 1: Update the test for `confirmBlitzReview` to expect new fields**

In `src/store/actions/blitz.test.ts`, find the `confirmBlitzReview` test and add assertions:

```typescript
expect(result.playerResults).toBeDefined();
expect(result.difficulty).toBeGreaterThan(0);
expect(result.topicIndex).toBe(-1);
expect(result.groups).toBeDefined();
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/actions/blitz.test.ts -t "confirmBlitzReview"`

Expected: FAIL

- [ ] **Step 3: Update `confirmBlitzReview()` in `src/store/actions/blitz.ts`**

Add import at top:

```typescript
import type { AnswerEvaluation, BlitzPhase, PlayerRoundResult, RoundState, ReviewResult, RoundResult, TimerState } from "@/types/game";
```

Replace the `confirmBlitzReview` function (lines 320-349):

```typescript
export function confirmBlitzReview(): void {
  const state = useGameStore.getState();
  if (state.phase !== "blitz-review") return;
  const round = state.currentRound;
  if (!round || round.type !== "blitz" || !round.reviewResult) return;

  const review = round.reviewResult;
  const task = round.blitzTaskIndex != null ? state.blitzTasks[round.blitzTaskIndex] : undefined;
  const item = task && round.blitzItemIndex != null ? task.items[round.blitzItemIndex] : undefined;

  const playerResults: PlayerRoundResult[] = review.evaluations.map((ev) => {
    const answer = round.answers[ev.playerName];
    return {
      playerName: ev.playerName,
      answerText: answer?.text ?? "",
      correct: ev.correct,
      answerTime: answer ? answer.timestamp - round.activeTimerStartedAt : Infinity,
      groupIndex: review.groups.findIndex((g) => g.includes(ev.playerName)),
    };
  });

  const result: RoundResult = {
    type: "blitz",
    teamId: round.teamId,
    captainName: round.captainName,
    blitzTaskIndex: round.blitzTaskIndex,
    score: review.score,
    jokerUsed: false,
    playerResults,
    difficulty: item?.difficulty ?? 0,
    topicIndex: -1,
    bonusTimeApplied: review.bonusTimeApplied,
    bonusTime: review.bonusTime,
    bonusTimeMultiplier: review.bonusTimeMultiplier,
    groups: review.groups,
  };

  const teams = state.teams.map((teamData) =>
    teamData.id === round.teamId
      ? { ...teamData, score: teamData.score + review.score }
      : teamData,
  );

  const history = [...state.history, result];
  
  useGameStore.getState().setState({
    history,
    teams,
    players: state.players.map((p) => ({ ...p, ready: false })),
  });
  
  goToNextRound();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/actions/blitz.test.ts -t "confirmBlitzReview"`

Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/store/actions/blitz.ts src/store/actions/blitz.test.ts
git commit -m "feat(blitz): populate extended RoundResult with player data in confirmBlitzReview"
```

---

### Task 4: Nomination types and `computeNominations` engine

**Files:**
- Create: `src/logic/nominations/types.ts`
- Create: `src/logic/nominations/index.ts`
- Create: `src/logic/nominations/index.test.ts`

- [ ] **Step 1: Create nomination types**

Create `src/logic/nominations/types.ts`:

```typescript
import type { PlayerDisplay, PlayerData, RoundResult, Topic } from "@/types/game";

export interface Nomination {
  id: string;
  emoji: string;
  titleKey: string;
  descriptionKey: string;
  winners: PlayerDisplay[];
  stat?: string;
}

export interface NominationCandidate {
  playerName: string;
  value: number;
  statLabel: string;
}

export interface NominationContext {
  history: RoundResult[];
  players: PlayerData[];
  topics: Topic[];
}

export interface NominationRule {
  id: string;
  emoji: string;
  titleKey: string;
  descriptionKey: string;
  tieStrategy: "skip" | "all" | "random";
  compute: (ctx: NominationContext) => NominationCandidate[] | null;
}
```

- [ ] **Step 2: Write test for `computeNominations`**

Create `src/logic/nominations/index.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { computeNominations } from "./index";
import type { NominationRule, NominationContext } from "./types";
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/logic/nominations/index.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 4: Implement `computeNominations`**

Create `src/logic/nominations/index.ts`:

```typescript
import type { PlayerData, RoundResult, Topic } from "@/types/game";
import type { Nomination, NominationCandidate, NominationContext, NominationRule } from "./types";

export { type Nomination, type NominationRule, type NominationContext } from "./types";

export function computeNominations(
  history: RoundResult[],
  players: PlayerData[],
  topics: Topic[],
  rules: NominationRule[],
): Nomination[] {
  const ctx: NominationContext = { history, players, topics };
  const results: Nomination[] = [];

  for (const rule of rules) {
    const candidates = rule.compute(ctx);
    if (!candidates || candidates.length === 0) continue;

    const maxValue = candidates[0]!.value;
    const leaders = candidates.filter((c) => c.value === maxValue);

    if (leaders.length > 1) {
      if (rule.tieStrategy === "skip") continue;
      if (rule.tieStrategy === "random") {
        const pick = leaders[Math.floor(Math.random() * leaders.length)]!;
        results.push(toNomination(rule, [pick], pick.statLabel));
      } else {
        // "all"
        results.push(toNomination(rule, leaders, leaders[0]!.statLabel));
      }
    } else {
      results.push(toNomination(rule, leaders, leaders[0]!.statLabel));
    }
  }

  return results;
}

function toNomination(
  rule: NominationRule,
  winners: NominationCandidate[],
  stat: string,
): Nomination {
  return {
    id: rule.id,
    emoji: rule.emoji,
    titleKey: rule.titleKey,
    descriptionKey: rule.descriptionKey,
    winners: [], // placeholder — resolved by caller with player lookup
    stat,
  };
}
```

Wait — the `winners` field needs `PlayerDisplay[]`. Update `toNomination` to accept players context:

```typescript
import type { PlayerData, PlayerDisplay, RoundResult, Topic } from "@/types/game";

// ... (computeNominations body same as above, but pass `players` to toNomination)

function resolveWinners(
  candidates: NominationCandidate[],
  players: PlayerData[],
): PlayerDisplay[] {
  return candidates.map((c) => {
    const player = players.find((p) => p.name === c.playerName);
    return {
      emoji: player?.emoji ?? "",
      name: c.playerName,
      team: player?.team ?? "none",
    };
  });
}
```

Full implementation of `src/logic/nominations/index.ts`:

```typescript
import type { PlayerData, PlayerDisplay, RoundResult, Topic } from "@/types/game";
import type { Nomination, NominationCandidate, NominationContext, NominationRule } from "./types";

export { type Nomination, type NominationRule, type NominationContext } from "./types";

export function computeNominations(
  history: RoundResult[],
  players: PlayerData[],
  topics: Topic[],
  rules: NominationRule[],
): Nomination[] {
  const ctx: NominationContext = { history, players, topics };
  const results: Nomination[] = [];

  for (const rule of rules) {
    const candidates = rule.compute(ctx);
    if (!candidates || candidates.length === 0) continue;

    const maxValue = candidates[0]!.value;
    const leaders = candidates.filter((c) => c.value === maxValue);

    let selectedCandidates: NominationCandidate[];
    if (leaders.length > 1) {
      if (rule.tieStrategy === "skip") continue;
      if (rule.tieStrategy === "random") {
        const pick = leaders[Math.floor(Math.random() * leaders.length)]!;
        selectedCandidates = [pick];
      } else {
        selectedCandidates = leaders;
      }
    } else {
      selectedCandidates = leaders;
    }

    results.push({
      id: rule.id,
      emoji: rule.emoji,
      titleKey: rule.titleKey,
      descriptionKey: rule.descriptionKey,
      winners: resolveWinners(selectedCandidates, players),
      stat: selectedCandidates[0]!.statLabel,
    });
  }

  return results;
}

function resolveWinners(
  candidates: NominationCandidate[],
  players: PlayerData[],
): PlayerDisplay[] {
  return candidates.map((c) => {
    const player = players.find((p) => p.name === c.playerName);
    return {
      emoji: player?.emoji ?? "",
      name: c.playerName,
      team: player?.team ?? "none",
    };
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/logic/nominations/index.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/logic/nominations/
git commit -m "feat(nominations): add types and computeNominations engine with tie strategies"
```

---

### Task 5: Nomination rules — accuracy category (sniper, miss, flawless, erudite)

**Files:**
- Create: `src/logic/nominations/rules/sniper.ts`
- Create: `src/logic/nominations/rules/sniper.test.ts`
- Create: `src/logic/nominations/rules/miss.ts`
- Create: `src/logic/nominations/rules/miss.test.ts`
- Create: `src/logic/nominations/rules/flawless.ts`
- Create: `src/logic/nominations/rules/flawless.test.ts`
- Create: `src/logic/nominations/rules/erudite.ts`
- Create: `src/logic/nominations/rules/erudite.test.ts`

- [ ] **Step 1: Write tests for sniper rule**

Create `src/logic/nominations/rules/sniper.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { sniperRule } from "./sniper";
import type { NominationContext } from "../types";
import type { RoundResult, PlayerData, Topic } from "@/types/game";

function makeCtx(playerResults: RoundResult["playerResults"][]): NominationContext {
  const history: RoundResult[] = playerResults.map((pr, i) => ({
    type: "round",
    teamId: "red",
    captainName: "Captain",
    questionIndex: i,
    score: 100,
    jokerUsed: false,
    playerResults: pr,
    difficulty: 100,
    topicIndex: 0,
    bonusTimeApplied: false,
    bonusTime: 0,
    bonusTimeMultiplier: 1,
    groups: [],
  }));
  const players: PlayerData[] = [
    { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
    { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
    { name: "Captain", emoji: "👺", team: "red", online: true, ready: true },
  ];
  return { history, players, topics: [] };
}

describe("sniperRule", () => {
  it("returns player with highest correct %", () => {
    const result = sniperRule.compute(makeCtx([
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 3000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: false, answerTime: 4000, groupIndex: 1 },
      ],
      [
        { playerName: "Alice", answerText: "a", correct: true, answerTime: 3000, groupIndex: 0 },
        { playerName: "Bob", answerText: "b", correct: true, answerTime: 4000, groupIndex: 1 },
      ],
    ]));
    expect(result).not.toBeNull();
    expect(result![0]!.playerName).toBe("Alice");
  });

  it("returns null when no player results", () => {
    const result = sniperRule.compute(makeCtx([]));
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/logic/nominations/rules/sniper.test.ts`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement sniper rule**

Create `src/logic/nominations/rules/sniper.ts`:

```typescript
import type { NominationRule } from "../types";

export const sniperRule: NominationRule = {
  id: "sniper",
  emoji: "🎯",
  titleKey: "finale.nomination.sniper.title",
  descriptionKey: "finale.nomination.sniper.description",
  tieStrategy: "skip",
  compute: (ctx) => {
    const stats = new Map<string, { correct: number; total: number }>();

    for (const round of ctx.history) {
      for (const pr of round.playerResults) {
        if (pr.correct === null) continue;
        const s = stats.get(pr.playerName) ?? { correct: 0, total: 0 };
        s.total++;
        if (pr.correct) s.correct++;
        stats.set(pr.playerName, s);
      }
    }

    if (stats.size === 0) return null;

    const candidates = [...stats.entries()]
      .filter(([, s]) => s.total > 0)
      .map(([name, s]) => ({
        playerName: name,
        value: s.correct / s.total,
        statLabel: `${Math.round((s.correct / s.total) * 100)}%`,
      }))
      .sort((a, b) => b.value - a.value);

    return candidates.length > 0 ? candidates : null;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/logic/nominations/rules/sniper.test.ts`

Expected: PASS

- [ ] **Step 5: Implement miss, flawless, erudite rules with tests**

Follow the same test-first pattern for each. Key logic:

**miss.ts** — Same as sniper but sorted ascending (lowest correct %). `tieStrategy: "skip"`.

**flawless.ts** — Filter players with 100% correct rate, at least 1 answer. `tieStrategy: "all"`. Return all qualifying players.

**erudite.ts** — Count distinct `topicIndex` values where player had at least one correct answer. Highest count wins. `tieStrategy: "skip"`. Skip rounds with `topicIndex === -1` (blitz).

- [ ] **Step 6: Run all rule tests**

Run: `npx vitest run src/logic/nominations/rules/`

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/logic/nominations/rules/
git commit -m "feat(nominations): add accuracy rules — sniper, miss, flawless, erudite"
```

---

### Task 6: Nomination rules — speed category (quickDraw, philosopher, captainsDaughter, sinkTheShip)

**Files:**
- Create: `src/logic/nominations/rules/quickDraw.ts` + test
- Create: `src/logic/nominations/rules/philosopher.ts` + test
- Create: `src/logic/nominations/rules/captainsDaughter.ts` + test
- Create: `src/logic/nominations/rules/sinkTheShip.ts` + test

- [ ] **Step 1: Write tests for all four rules**

Key logic:

**quickDraw.ts** — Average `answerTime` across all rounds where player was NOT captain and answer was not empty. Lowest wins. `tieStrategy: "skip"`. Exclude `answerTime === Infinity`.

**philosopher.ts** — Same metric, highest wins. `tieStrategy: "skip"`.

**captainsDaughter.ts** — Count rounds where player had the lowest `answerTime` among non-captain players with non-empty answers. Highest count wins. `tieStrategy: "skip"`.

**sinkTheShip.ts** — Count rounds where exactly one player was incorrect and all others correct. That player gets +1. Highest count wins. `tieStrategy: "skip"`.

- [ ] **Step 2: Implement all four rules**

Follow the test-first pattern from Task 5 for each rule.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/logic/nominations/rules/`

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/logic/nominations/rules/
git commit -m "feat(nominations): add speed rules — quickDraw, philosopher, captainsDaughter, sinkTheShip"
```

---

### Task 7: Nomination rules — captain category (captainObvious, captainFail, eternalCaptain, ambitious, cautious, goldMine)

**Files:**
- Create: `src/logic/nominations/rules/captainObvious.ts` + test
- Create: `src/logic/nominations/rules/captainFail.ts` + test
- Create: `src/logic/nominations/rules/eternalCaptain.ts` + test
- Create: `src/logic/nominations/rules/ambitious.ts` + test
- Create: `src/logic/nominations/rules/cautious.ts` + test
- Create: `src/logic/nominations/rules/goldMine.ts` + test

- [ ] **Step 1: Write tests for all six rules**

Key logic:

**captainObvious** — Sum `score` for rounds where player was `captainName`. Highest wins. `tieStrategy: "skip"`.

**captainFail** — Same metric, lowest wins. Only include players who were captain at least once. `tieStrategy: "skip"`.

**eternalCaptain** — Count how many times each player appears as `captainName`. Highest count wins. `tieStrategy: "skip"`.

**ambitious** — Average `difficulty` of rounds where player was captain. Highest wins. `tieStrategy: "skip"`.

**cautious** — Same metric, lowest wins. `tieStrategy: "skip"`.

**goldMine** — Same as captainObvious (sum score as captain). Highest wins. `tieStrategy: "skip"`.

Note: `captainObvious` and `goldMine` have the same metric. The spec lists both — implement both as separate rules with separate IDs and i18n keys. They will produce the same winner, which is fine.

- [ ] **Step 2: Implement all six rules**

Follow test-first pattern.

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/logic/nominations/rules/`

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/logic/nominations/rules/
git commit -m "feat(nominations): add captain rules — captainObvious, captainFail, eternalCaptain, ambitious, cautious, goldMine"
```

---

### Task 8: Nomination rules — risk category (riskyPlayer, unluckyGambler, jackpot)

**Files:**
- Create: `src/logic/nominations/rules/riskyPlayer.ts` + test
- Create: `src/logic/nominations/rules/unluckyGambler.ts` + test
- Create: `src/logic/nominations/rules/jackpot.ts` + test

- [ ] **Step 1: Write tests and implement**

Key logic:

**riskyPlayer** — Find rounds where `jokerUsed === true`. Check if >50% of `playerResults` have `correct === true` AND unique group (groupIndex points to a group of size 1). Award captain. `tieStrategy: "all"`.

**unluckyGambler** — Same, but <50%. Award captain. `tieStrategy: "all"`.

**jackpot** — Find the round with highest `score`. Award its `captainName`. `tieStrategy: "all"`.

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/logic/nominations/rules/`

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/logic/nominations/rules/
git commit -m "feat(nominations): add risk rules — riskyPlayer, unluckyGambler, jackpot"
```

---

### Task 9: Nomination rules — answer category (iDontPlay, longestAnswer, typewriter, brevity, narrowSpecialist)

**Files:**
- Create: `src/logic/nominations/rules/iDontPlay.ts` + test
- Create: `src/logic/nominations/rules/longestAnswer.ts` + test
- Create: `src/logic/nominations/rules/typewriter.ts` + test
- Create: `src/logic/nominations/rules/brevity.ts` + test
- Create: `src/logic/nominations/rules/narrowSpecialist.ts` + test

- [ ] **Step 1: Write tests and implement**

Key logic:

**iDontPlay** — Count rounds where player's `answerText === ""`. Highest count wins. Only award if count > 0. `tieStrategy: "skip"`.

**longestAnswer** — Average `answerText.length` across all non-empty answers. Highest wins. `tieStrategy: "random"`.

**typewriter** — Sum of `answerText.length` across all answers. Highest wins. `tieStrategy: "random"`.

**brevity** — Sum of `answerText.length` across answers where `correct === true`. Lowest wins. Only include players with at least one correct answer. `tieStrategy: "random"`.

**narrowSpecialist** — Collect distinct `topicIndex` values where player had `correct === true`. Award if exactly 1 topic. Only if game had 2+ topics. When multiple qualify, compare by sum of `difficulty` for their correct answers — highest wins. `tieStrategy: "skip"`.

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/logic/nominations/rules/`

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/logic/nominations/rules/
git commit -m "feat(nominations): add answer rules — iDontPlay, longestAnswer, typewriter, brevity, narrowSpecialist"
```

---

### Task 10: Nomination rules — blitz + special categories

**Files:**
- Create: `src/logic/nominations/rules/blitzMaster.ts` + test
- Create: `src/logic/nominations/rules/sayMyName.ts` + test
- Create: `src/logic/nominations/rules/artist.ts` + test
- Create: `src/logic/nominations/rules/mentalConnection.ts` + test
- Create: `src/logic/nominations/rules/stuckRecord.ts` + test
- Create: `src/logic/nominations/rules/interviewer.ts` + test
- Create: `src/logic/nominations/rules/robot.ts` + test
- Create: `src/logic/nominations/rules/spy.ts` + test

- [ ] **Step 1: Write tests and implement**

Key logic:

**blitzMaster** — Sum `score` from rounds where `type === "blitz"` and player was `captainName`. Highest wins. `tieStrategy: "skip"`.

**sayMyName** — Check if any player's `answerText` (case-insensitive) contains another player's `name`. Count occurrences per player. Highest count wins. Only award if count > 0. `tieStrategy: "skip"`.

**artist** — Count emoji characters (use regex `/\p{Emoji_Presentation}/gu`) across all `answerText`. Highest count wins. Only if count > 0. `tieStrategy: "skip"`.

**mentalConnection** — Count rounds where player had `correct === true` AND was in a group (`groups[groupIndex]`) of size >= 2. Highest count wins. `tieStrategy: "skip"`.

**stuckRecord** — For each player, collect all non-empty `answerText` values (case-insensitive). Find the most repeated one. The player whose most-repeated answer appears the most times wins, provided at least one of those answers was `correct === true`. `tieStrategy: "skip"`.

**interviewer** — Count "?" characters across all `answerText`. Award to every player with count > 0. `tieStrategy: "all"`.

**robot** — Check if any `answerText` matches `/^[01]{2,}$/`. Award to every qualifying player. `tieStrategy: "all"`.

**spy** — Check if any `answerText` has length > 3 and matches `/^[^\p{L}\d]+$/u` (no letters of any script, no digits). Award to every qualifying player. `tieStrategy: "all"`.

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/logic/nominations/rules/`

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/logic/nominations/rules/
git commit -m "feat(nominations): add blitz + special rules — blitzMaster, sayMyName, artist, mentalConnection, stuckRecord, interviewer, robot, spy"
```

---

### Task 11: Wire all rules into NOMINATION_RULES array

**Files:**
- Modify: `src/logic/nominations/index.ts`

- [ ] **Step 1: Import all rules and create the array**

Add to `src/logic/nominations/index.ts`:

```typescript
import { sniperRule } from "./rules/sniper";
import { missRule } from "./rules/miss";
import { flawlessRule } from "./rules/flawless";
import { eruditeRule } from "./rules/erudite";
import { quickDrawRule } from "./rules/quickDraw";
import { philosopherRule } from "./rules/philosopher";
import { captainsDaughterRule } from "./rules/captainsDaughter";
import { sinkTheShipRule } from "./rules/sinkTheShip";
import { captainObviousRule } from "./rules/captainObvious";
import { captainFailRule } from "./rules/captainFail";
import { eternalCaptainRule } from "./rules/eternalCaptain";
import { ambitiousRule } from "./rules/ambitious";
import { cautiousRule } from "./rules/cautious";
import { goldMineRule } from "./rules/goldMine";
import { riskyPlayerRule } from "./rules/riskyPlayer";
import { unluckyGamblerRule } from "./rules/unluckyGambler";
import { jackpotRule } from "./rules/jackpot";
import { iDontPlayRule } from "./rules/iDontPlay";
import { longestAnswerRule } from "./rules/longestAnswer";
import { typewriterRule } from "./rules/typewriter";
import { brevityRule } from "./rules/brevity";
import { narrowSpecialistRule } from "./rules/narrowSpecialist";
import { blitzMasterRule } from "./rules/blitzMaster";
import { sayMyNameRule } from "./rules/sayMyName";
import { artistRule } from "./rules/artist";
import { mentalConnectionRule } from "./rules/mentalConnection";
import { stuckRecordRule } from "./rules/stuckRecord";
import { interviewerRule } from "./rules/interviewer";
import { robotRule } from "./rules/robot";
import { spyRule } from "./rules/spy";

export const NOMINATION_RULES: NominationRule[] = [
  sniperRule,
  missRule,
  flawlessRule,
  eruditeRule,
  quickDrawRule,
  philosopherRule,
  captainsDaughterRule,
  sinkTheShipRule,
  captainObviousRule,
  captainFailRule,
  eternalCaptainRule,
  ambitiousRule,
  cautiousRule,
  goldMineRule,
  riskyPlayerRule,
  unluckyGamblerRule,
  jackpotRule,
  iDontPlayRule,
  longestAnswerRule,
  typewriterRule,
  brevityRule,
  narrowSpecialistRule,
  blitzMasterRule,
  sayMyNameRule,
  artistRule,
  mentalConnectionRule,
  stuckRecordRule,
  interviewerRule,
  robotRule,
  spyRule,
];
```

Also export a convenience function using the default rules:

```typescript
export function getAllNominations(
  history: RoundResult[],
  players: PlayerData[],
  topics: Topic[],
): Nomination[] {
  return computeNominations(history, players, topics, NOMINATION_RULES);
}
```

- [ ] **Step 2: Run full nomination test suite**

Run: `npx vitest run src/logic/nominations/`

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/logic/nominations/index.ts
git commit -m "feat(nominations): wire all 30 rules into NOMINATION_RULES array"
```

---

### Task 12: `useCarousel` hook

**Files:**
- Create: `src/hooks/useCarousel.ts`
- Create: `src/hooks/useCarousel.test.ts`

- [ ] **Step 1: Write test**

Create `src/hooks/useCarousel.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCarousel } from "./useCarousel";

describe("useCarousel", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("starts at slide 0, playing", () => {
    const { result } = renderHook(() => useCarousel(5, 8000));
    expect(result.current.current).toBe(0);
    expect(result.current.isPlaying).toBe(true);
  });

  it("auto-advances after interval", () => {
    const { result } = renderHook(() => useCarousel(5, 8000));
    act(() => { vi.advanceTimersByTime(8000); });
    expect(result.current.current).toBe(1);
  });

  it("stops auto-advance on last slide", () => {
    const { result } = renderHook(() => useCarousel(3, 1000));
    act(() => { vi.advanceTimersByTime(1000); }); // -> 1
    act(() => { vi.advanceTimersByTime(1000); }); // -> 2 (last)
    expect(result.current.current).toBe(2);
    expect(result.current.isPlaying).toBe(false);
    act(() => { vi.advanceTimersByTime(1000); }); // should stay at 2
    expect(result.current.current).toBe(2);
  });

  it("next() advances and resets timer", () => {
    const { result } = renderHook(() => useCarousel(5, 8000));
    act(() => { vi.advanceTimersByTime(7000); }); // almost at auto
    act(() => { result.current.next(); });
    expect(result.current.current).toBe(1);
    act(() => { vi.advanceTimersByTime(7000); }); // timer was reset, not yet
    expect(result.current.current).toBe(1);
    act(() => { vi.advanceTimersByTime(1000); }); // now auto fires
    expect(result.current.current).toBe(2);
  });

  it("prev() goes back", () => {
    const { result } = renderHook(() => useCarousel(5, 8000));
    act(() => { result.current.next(); });
    act(() => { result.current.prev(); });
    expect(result.current.current).toBe(0);
  });

  it("prev() does not go below 0", () => {
    const { result } = renderHook(() => useCarousel(5, 8000));
    act(() => { result.current.prev(); });
    expect(result.current.current).toBe(0);
  });

  it("togglePlay pauses and resumes", () => {
    const { result } = renderHook(() => useCarousel(5, 8000));
    act(() => { result.current.togglePlay(); });
    expect(result.current.isPlaying).toBe(false);
    act(() => { vi.advanceTimersByTime(16000); });
    expect(result.current.current).toBe(0); // no advance while paused
    act(() => { result.current.togglePlay(); });
    expect(result.current.isPlaying).toBe(true);
  });

  it("goTo jumps to specific slide", () => {
    const { result } = renderHook(() => useCarousel(5, 8000));
    act(() => { result.current.goTo(3); });
    expect(result.current.current).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useCarousel.test.ts`

Expected: FAIL

- [ ] **Step 3: Implement hook**

Create `src/hooks/useCarousel.ts`:

```typescript
import { useState, useCallback, useEffect, useRef } from "react";

const DEFAULT_INTERVAL = 8000;

export function useCarousel(totalSlides: number, intervalMs = DEFAULT_INTERVAL) {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setCurrent((prev) => {
        const next = prev + 1;
        if (next >= totalSlides - 1) {
          setIsPlaying(false);
          clearInterval(timerRef.current!);
          timerRef.current = null;
        }
        return Math.min(next, totalSlides - 1);
      });
    }, intervalMs);
  }, [totalSlides, intervalMs, clearTimer]);

  useEffect(() => {
    if (isPlaying && current < totalSlides - 1) {
      startTimer();
    }
    return clearTimer;
  }, [isPlaying, startTimer, clearTimer, current, totalSlides]);

  const next = useCallback(() => {
    setCurrent((prev) => {
      const n = Math.min(prev + 1, totalSlides - 1);
      if (n >= totalSlides - 1) setIsPlaying(false);
      return n;
    });
  }, [totalSlides]);

  const prev = useCallback(() => {
    setCurrent((prev) => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback((i: number) => {
    setCurrent(Math.max(0, Math.min(i, totalSlides - 1)));
  }, [totalSlides]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return { current, isPlaying, next, prev, goTo, togglePlay };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useCarousel.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useCarousel.ts src/hooks/useCarousel.test.ts
git commit -m "feat(hooks): add useCarousel hook with auto-advance, pause, navigation"
```

---

### Task 13: i18n keys for finale

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add finale keys to `ru.json`**

Add inside the top-level JSON object:

```json
"finale": {
  "victory": "Победа команды {{team}}!",
  "draw": "Ничья!",
  "gameOver": "Игра окончена!",
  "nomination": {
    "sniper": { "title": "Снайпер", "description": "Самый высокий % правильных ответов" },
    "miss": { "title": "Мимо кассы", "description": "Самый низкий % правильных ответов" },
    "flawless": { "title": "Безупречный", "description": "100% правильных ответов" },
    "erudite": { "title": "Эрудит", "description": "Правильные ответы в наибольшем числе тем" },
    "quickDraw": { "title": "Самая быстрая рука", "description": "Самое быстрое среднее время ответа" },
    "philosopher": { "title": "Философ", "description": "Самое медленное среднее время ответа" },
    "captainsDaughter": { "title": "Капитанская дочка", "description": "Чаще всех отвечал первым" },
    "sinkTheShip": { "title": "На дно!", "description": "Единственный неправильный ответ в раунде" },
    "captainObvious": { "title": "Капитан очевидность", "description": "Капитан с наибольшим суммарным счётом" },
    "captainFail": { "title": "Капитан неудача", "description": "Капитан с наименьшим суммарным счётом" },
    "eternalCaptain": { "title": "Вечный капитан", "description": "Был капитаном больше всех раз" },
    "ambitious": { "title": "Выше амбиций", "description": "Выбирал самые сложные вопросы" },
    "cautious": { "title": "Осторожный", "description": "Выбирал самые лёгкие вопросы" },
    "goldMine": { "title": "Золотая жила", "description": "Больше всего очков в роли капитана" },
    "riskyPlayer": { "title": "Рисковый игрок", "description": "Успешно использовал джокер" },
    "unluckyGambler": { "title": "Азартный неудачник", "description": "Использовал джокер, но раунд провалился" },
    "jackpot": { "title": "Джекпот", "description": "Максимальный счёт за один раунд" },
    "iDontPlay": { "title": "Я не играю", "description": "Чаще всех сдавался" },
    "longestAnswer": { "title": "Самый длинный ответ", "description": "Наибольшая средняя длина ответа" },
    "typewriter": { "title": "Печатная машина", "description": "Наибольшая суммарная длина ответов" },
    "brevity": { "title": "Краткость — сестра таланта", "description": "Наименьшая суммарная длина верных ответов" },
    "narrowSpecialist": { "title": "Узкий специалист", "description": "Верные ответы только в одной категории" },
    "blitzMaster": { "title": "Блиц-мастер", "description": "Больше всего очков в блиц-раундах" },
    "sayMyName": { "title": "Say my name", "description": "Написал имя другого игрока в ответе" },
    "artist": { "title": "Художник", "description": "Чаще всех использовал эмодзи в ответах" },
    "mentalConnection": { "title": "Ментальная связь", "description": "Чаще всех давал верный ответ-дубль" },
    "stuckRecord": { "title": "Заело пластинку", "description": "Давал одинаковые ответы на разные вопросы" },
    "interviewer": { "title": "Интервьюер", "description": "Использовал «?» в ответах" },
    "robot": { "title": "Робот", "description": "Дал ответ в двоичной системе" },
    "spy": { "title": "Шпион", "description": "Дал ответ без букв и цифр" }
  }
}
```

- [ ] **Step 2: Add finale keys to `en.json`**

```json
"finale": {
  "victory": "{{team}} wins!",
  "draw": "It's a draw!",
  "gameOver": "Game over!",
  "nomination": {
    "sniper": { "title": "Sniper", "description": "Highest correct answer rate" },
    "miss": { "title": "Off Target", "description": "Lowest correct answer rate" },
    "flawless": { "title": "Flawless", "description": "100% correct answers" },
    "erudite": { "title": "Erudite", "description": "Correct answers in the most topics" },
    "quickDraw": { "title": "Quick Draw", "description": "Fastest average answer time" },
    "philosopher": { "title": "Philosopher", "description": "Slowest average answer time" },
    "captainsDaughter": { "title": "Captain's Daughter", "description": "Answered first most often" },
    "sinkTheShip": { "title": "Sink the Ship!", "description": "Only wrong answer in the round" },
    "captainObvious": { "title": "Captain Obvious", "description": "Captain with highest total score" },
    "captainFail": { "title": "Captain Fail", "description": "Captain with lowest total score" },
    "eternalCaptain": { "title": "Eternal Captain", "description": "Was captain the most times" },
    "ambitious": { "title": "Ambitious", "description": "Picked the hardest questions" },
    "cautious": { "title": "Cautious", "description": "Picked the easiest questions" },
    "goldMine": { "title": "Gold Mine", "description": "Most points scored as captain" },
    "riskyPlayer": { "title": "Risky Player", "description": "Used joker successfully" },
    "unluckyGambler": { "title": "Unlucky Gambler", "description": "Used joker but the round failed" },
    "jackpot": { "title": "Jackpot", "description": "Highest score in a single round" },
    "iDontPlay": { "title": "I Don't Play", "description": "Gave up the most answers" },
    "longestAnswer": { "title": "Longest Answer", "description": "Highest average answer length" },
    "typewriter": { "title": "Typewriter", "description": "Highest total answer length" },
    "brevity": { "title": "Brevity Is Wit", "description": "Shortest total correct answer length" },
    "narrowSpecialist": { "title": "Narrow Specialist", "description": "Correct only in one topic" },
    "blitzMaster": { "title": "Blitz Master", "description": "Most points in blitz rounds" },
    "sayMyName": { "title": "Say My Name", "description": "Wrote another player's name" },
    "artist": { "title": "Artist", "description": "Used the most emoji in answers" },
    "mentalConnection": { "title": "Mental Connection", "description": "Most duplicate correct answers" },
    "stuckRecord": { "title": "Stuck Record", "description": "Same answer on multiple questions" },
    "interviewer": { "title": "Interviewer", "description": "Used «?» in answers" },
    "robot": { "title": "Robot", "description": "Answered in binary" },
    "spy": { "title": "Spy", "description": "Answered without letters or digits" }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/ru.json src/i18n/en.json
git commit -m "feat(i18n): add finale and nomination translation keys"
```

---

### Task 14: `NominationCarousel` component

**Files:**
- Create: `src/components/NominationCarousel/NominationCarousel.tsx`
- Create: `src/components/NominationCarousel/NominationCarousel.module.css`
- Create: `src/components/NominationCarousel/NominationSlide.tsx`
- Create: `src/components/NominationCarousel/NominationCarousel.test.tsx`
- Create: `src/components/NominationCarousel/NominationCarousel.stories.tsx`

- [ ] **Step 1: Write test**

Create `src/components/NominationCarousel/NominationCarousel.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { NominationCarousel } from "./NominationCarousel";
import type { Nomination } from "@/logic/nominations/types";

const mockNominations: Nomination[] = [
  {
    id: "sniper",
    emoji: "🎯",
    titleKey: "finale.nomination.sniper.title",
    descriptionKey: "finale.nomination.sniper.description",
    winners: [{ emoji: "😈", name: "Alice", team: "red" }],
    stat: "92%",
  },
  {
    id: "philosopher",
    emoji: "🤔",
    titleKey: "finale.nomination.philosopher.title",
    descriptionKey: "finale.nomination.philosopher.description",
    winners: [{ emoji: "👹", name: "Bob", team: "blue" }],
    stat: "12.5s",
  },
];

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("NominationCarousel", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders first nomination", () => {
    render(<NominationCarousel nominations={mockNominations} />);
    expect(screen.getByText("🎯")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("advances to next slide on next button", () => {
    render(<NominationCarousel nominations={mockNominations} />);
    fireEvent.click(screen.getByLabelText("next"));
    expect(screen.getByText("🤔")).toBeInTheDocument();
  });

  it("auto-advances after 8 seconds", () => {
    render(<NominationCarousel nominations={mockNominations} />);
    act(() => { vi.advanceTimersByTime(8000); });
    expect(screen.getByText("🤔")).toBeInTheDocument();
  });

  it("renders progress dots", () => {
    render(<NominationCarousel nominations={mockNominations} />);
    const dots = screen.getAllByRole("button", { name: /slide/i });
    expect(dots).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/NominationCarousel/`

Expected: FAIL

- [ ] **Step 3: Create `NominationSlide.tsx`**

```typescript
import { useTranslation } from "react-i18next";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import type { Nomination } from "@/logic/nominations/types";
import styles from "./NominationCarousel.module.css";

interface NominationSlideProps {
  nomination: Nomination;
}

export function NominationSlide({ nomination }: NominationSlideProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.slide}>
      <div className={styles.emoji}>{nomination.emoji}</div>
      <h2 className={styles.title}>{t(nomination.titleKey)}</h2>
      <div className={styles.winners}>
        {nomination.winners.map((w) => (
          <PlayerAvatar key={w.name} emoji={w.emoji} name={w.name} team={w.team} />
        ))}
      </div>
      {nomination.stat && <div className={styles.stat}>{nomination.stat}</div>}
      <p className={styles.description}>{t(nomination.descriptionKey)}</p>
    </div>
  );
}
```

- [ ] **Step 4: Create `NominationCarousel.tsx`**

```typescript
import { useCarousel } from "@/hooks/useCarousel";
import { NominationSlide } from "./NominationSlide";
import type { Nomination } from "@/logic/nominations/types";
import styles from "./NominationCarousel.module.css";
import cn from "classnames";

interface NominationCarouselProps {
  nominations: Nomination[];
}

export function NominationCarousel({ nominations }: NominationCarouselProps) {
  const { current, isPlaying, next, prev, goTo, togglePlay } = useCarousel(nominations.length);

  if (nominations.length === 0) return null;

  const nomination = nominations[current]!;

  return (
    <div className={styles.carousel} onClick={togglePlay}>
      <button
        className={cn(styles.navButton, styles.navPrev)}
        onClick={(e) => { e.stopPropagation(); prev(); }}
        aria-label="prev"
        disabled={current === 0}
      >
        ◀
      </button>

      <NominationSlide nomination={nomination} />

      <button
        className={cn(styles.navButton, styles.navNext)}
        onClick={(e) => { e.stopPropagation(); next(); }}
        aria-label="next"
        disabled={current === nominations.length - 1}
      >
        ▶
      </button>

      <div className={styles.dots}>
        {nominations.map((_, i) => (
          <button
            key={i}
            className={cn(styles.dot, { [styles.dotActive]: i === current })}
            onClick={(e) => { e.stopPropagation(); goTo(i); }}
            aria-label={`slide ${i + 1}`}
          />
        ))}
      </div>

      {!isPlaying && current < nominations.length - 1 && (
        <div className={styles.pauseIndicator}>⏸</div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Create CSS module**

Create `src/components/NominationCarousel/NominationCarousel.module.css`:

```css
.carousel {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-lg, 24px);
  cursor: pointer;
  user-select: none;
}

.slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  text-align: center;
  min-height: 200px;
}

.emoji {
  font-size: 3rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.winners {
  display: flex;
  gap: var(--spacing-sm, 8px);
  justify-content: center;
  flex-wrap: wrap;
}

.stat {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary, #4a90d9);
}

.description {
  font-size: 0.9rem;
  opacity: 0.7;
  margin: 0;
}

.navButton {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: var(--spacing-sm, 8px);
  opacity: 0.6;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

.navButton:hover:not(:disabled) {
  opacity: 1;
}

.navButton:disabled {
  opacity: 0.2;
  cursor: default;
}

.dots {
  position: absolute;
  bottom: 4px;
  display: flex;
  gap: 6px;
  justify-content: center;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: var(--color-border, #ccc);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s;
}

.dotActive {
  background: var(--color-primary, #4a90d9);
}

.pauseIndicator {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.8rem;
  opacity: 0.5;
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/components/NominationCarousel/`

Expected: PASS

- [ ] **Step 7: Create Ladle stories**

Create `src/components/NominationCarousel/NominationCarousel.stories.tsx`:

```typescript
import type { Story } from "@ladle/react";
import { NominationCarousel } from "./NominationCarousel";
import type { Nomination } from "@/logic/nominations/types";

const nominations: Nomination[] = [
  {
    id: "sniper",
    emoji: "🎯",
    titleKey: "finale.nomination.sniper.title",
    descriptionKey: "finale.nomination.sniper.description",
    winners: [{ emoji: "😈", name: "Alice", team: "red" }],
    stat: "92%",
  },
  {
    id: "philosopher",
    emoji: "🤔",
    titleKey: "finale.nomination.philosopher.title",
    descriptionKey: "finale.nomination.philosopher.description",
    winners: [{ emoji: "👹", name: "Bob", team: "blue" }],
    stat: "12.5s",
  },
  {
    id: "flawless",
    emoji: "✨",
    titleKey: "finale.nomination.flawless.title",
    descriptionKey: "finale.nomination.flawless.description",
    winners: [
      { emoji: "😈", name: "Alice", team: "red" },
      { emoji: "👺", name: "Carol", team: "blue" },
    ],
  },
];

export const Default: Story = () => (
  <NominationCarousel nominations={nominations} />
);

export const SingleNomination: Story = () => (
  <NominationCarousel nominations={[nominations[0]!]} />
);
```

- [ ] **Step 8: Commit**

```bash
git add src/components/NominationCarousel/
git commit -m "feat(ui): add NominationCarousel and NominationSlide components"
```

---

### Task 15: `HostFinale` and `PlayerFinale` pages

**Files:**
- Create: `src/pages/finale/HostFinale.tsx`
- Create: `src/pages/finale/FinaleScoreboard.tsx`
- Create: `src/pages/finale/PlayerFinale.tsx`
- Create: `src/pages/finale/HostFinale.test.tsx`
- Create: `src/pages/finale/PlayerFinale.test.tsx`

- [ ] **Step 1: Write tests for HostFinale**

Create `src/pages/finale/HostFinale.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HostFinale } from "./HostFinale";
import { useGameStore } from "@/store/gameStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, string>) => opts?.team ? `${key} ${opts.team}` : key }),
}));

describe("HostFinale", () => {
  it("renders scoreboard and nominations", () => {
    useGameStore.setState({
      phase: "finale",
      settings: { mode: "manual", teamMode: "dual", topicCount: 1, questionsPerTopic: 1, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "blue", online: true, ready: true },
      ],
      teams: [
        { id: "red", score: 200, jokerUsed: false },
        { id: "blue", score: 150, jokerUsed: false },
      ],
      topics: [{ name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: ["a"] }] }],
      history: [{
        type: "round",
        teamId: "red",
        captainName: "Alice",
        questionIndex: 0,
        score: 200,
        jokerUsed: false,
        playerResults: [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 3000, groupIndex: 0 },
        ],
        difficulty: 100,
        topicIndex: 0,
        bonusTimeApplied: false,
        bonusTime: 0,
        bonusTimeMultiplier: 1,
        groups: [["Alice"]],
      }],
      currentRound: null,
      timer: null,
    });

    render(<HostFinale />);
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write test for PlayerFinale**

Create `src/pages/finale/PlayerFinale.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerFinale } from "./PlayerFinale";
import { useGameStore } from "@/store/gameStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("PlayerFinale", () => {
  it("renders game over and score", () => {
    useGameStore.setState({
      phase: "finale",
      settings: { mode: "manual", teamMode: "single", topicCount: 1, questionsPerTopic: 1, blitzRoundsPerTeam: 0, pastQuestions: [] },
      teams: [{ id: "none", score: 500, jokerUsed: false }],
      players: [],
      topics: [],
      history: [],
      currentRound: null,
      timer: null,
    });

    render(<PlayerFinale />);
    expect(screen.getByText("finale.gameOver")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/pages/finale/`

Expected: FAIL

- [ ] **Step 4: Implement `FinaleScoreboard`**

Create `src/pages/finale/FinaleScoreboard.tsx`:

```typescript
import { useTranslation } from "react-i18next";
import { TeamScore } from "@/components/TeamScore/TeamScore";
import type { TeamData } from "@/types/game";

interface FinaleScoreboardProps {
  teams: TeamData[];
  teamMode: "single" | "dual";
}

export function FinaleScoreboard({ teams, teamMode }: FinaleScoreboardProps) {
  const { t } = useTranslation();

  let announcement: string;
  if (teamMode === "single") {
    announcement = t("finale.gameOver");
  } else {
    const maxScore = Math.max(...teams.map((t) => t.score));
    const leaders = teams.filter((t) => t.score === maxScore);
    if (leaders.length > 1) {
      announcement = t("finale.draw");
    } else {
      announcement = t("finale.victory", { team: t(`teams.${leaders[0]!.id}`) });
    }
  }

  return (
    <div>
      <h1>{announcement}</h1>
      <TeamScore teams={teams.map((t) => ({ id: t.id, score: t.score }))} />
    </div>
  );
}
```

- [ ] **Step 5: Implement `HostFinale`**

Create `src/pages/finale/HostFinale.tsx`:

```typescript
import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { FinaleScoreboard } from "./FinaleScoreboard";
import { NominationCarousel } from "@/components/NominationCarousel/NominationCarousel";
import { getAllNominations } from "@/logic/nominations";

export function HostFinale() {
  const teams = useGameStore((s) => s.teams);
  const teamMode = useGameStore((s) => s.settings.teamMode);
  const history = useGameStore((s) => s.history);
  const players = useGameStore((s) => s.players);
  const topics = useGameStore((s) => s.topics);

  const nominations = useMemo(
    () => getAllNominations(history, players, topics),
    [history, players, topics],
  );

  return (
    <>
      <FinaleScoreboard teams={teams} teamMode={teamMode} />
      <NominationCarousel nominations={nominations} />
    </>
  );
}
```

- [ ] **Step 6: Implement `PlayerFinale`**

Create `src/pages/finale/PlayerFinale.tsx`:

```typescript
import { useGameStore } from "@/store/gameStore";
import { FinaleScoreboard } from "./FinaleScoreboard";

export function PlayerFinale() {
  const teams = useGameStore((s) => s.teams);
  const teamMode = useGameStore((s) => s.settings.teamMode);

  return <FinaleScoreboard teams={teams} teamMode={teamMode} />;
}
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/pages/finale/`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/pages/finale/
git commit -m "feat(ui): add HostFinale, PlayerFinale, and FinaleScoreboard pages"
```

---

### Task 16: Wire finale pages into PlayPage routing

**Files:**
- Modify: `src/pages/PlayPage.tsx`

- [ ] **Step 1: Add imports and phase routing**

In `src/pages/PlayPage.tsx`, add imports at the top:

```typescript
import { HostFinale } from "./finale/HostFinale";
import { PlayerFinale } from "./finale/PlayerFinale";
```

In the host rendering section (around line 176), after the blitz line, add:

```typescript
{phase === "finale" && <HostFinale />}
```

In the player rendering section (around line 332), after the blitz block, add:

```typescript
{phase === "finale" && <PlayerFinale />}
```

- [ ] **Step 2: Run type check and full tests**

Run: `npx tsc --noEmit && npx vitest run`

Expected: All pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PlayPage.tsx
git commit -m "feat(routing): wire HostFinale and PlayerFinale into PlayPage phase routing"
```

---

### Task 17: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Play a complete game**

Play a game through all rounds until the finale phase triggers. Verify:
- Host screen shows scoreboard with correct scores
- Host screen shows nomination carousel with auto-advance
- Carousel navigation (prev/next/dots) works
- Click pauses/resumes auto-advance
- Player screen shows only the final score and winner/game over text

- [ ] **Step 3: Check Ladle stories**

Run: `npm run dev:storybook`

Verify `NominationCarousel` stories render correctly.

- [ ] **Step 4: Run full test suite one final time**

Run: `npx vitest run && npx tsc --noEmit`

Expected: All pass.

- [ ] **Step 5: Commit any fixes from smoke test**

If any fixes were needed, commit them.
