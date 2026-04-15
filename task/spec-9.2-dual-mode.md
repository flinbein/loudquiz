# Spec 9.2 — Dual Mode

Design document for phase 9.2 from `task/plan-01-init.md`: enabling two-team competitive play with alternating rounds, per-team scoring, state filtering for opponents, and a redesigned Toolbar that shows the active team to every player.

Date: 2026-04-16.

## Goals

- A full game of Loud Quiz can be played in dual mode from lobby to finale.
- Two teams (`red`, `blue`) alternate rounds and blitzes, ending with equal play counts.
- Opponents see what captains see, but cannot influence the active team's round.
- Players and host have a clear visual signal of which team is currently playing and in which phase.

## Non-goals

- Finale screen and statistics (phase 9.3).
- Re-play / game loop glue and state reset (phase 9.4).
- Reconnection handling (tracked in `task/spec-p2pt-reconnection.md`).
- Changes to blitz visibility rules in single mode (out of scope, only `hidden` prop flow is affected indirectly).

## 1. State and types

No new fields added to `GameState`, `GameSettings`, `RoundState`, or `TeamData`. All dual-mode behavior is derived from existing data:

- `settings.teamMode: "single" | "dual"` — already present.
- `teams: TeamData[]` — in dual mode contains `red` and `blue`, in single mode contains `none`. Per-team `score` and `jokerUsed` are already wired.
- `currentRound.teamId` — already used as "active team of this round".
- `history: RoundResult[]` — stores `teamId` per entry, enough to compute how many rounds each team has played.

No runtime helpers for effective counts (`getEffectiveQuestionCount`, etc.) — state is trimmed at load time instead (see §2), so runtime code never encounters odd totals in dual.

## 2. Team alternation and odd-count handling

### 2.1 Alternation

Already implemented in `goToNextRound` (`src/store/actions/round.ts`):

```ts
const team = state.teams.find(t => t.id !== currentRound?.teamId) ?? state.teams[0]!;
```

In single mode the fallback returns the sole `none` team. In dual mode it always picks "the other" team. **No change required.**

### 2.2 Odd-count trimming at source

Dual mode requires both teams to play the same number of rounds and blitzes. If either total is odd, the last item is trimmed before the game starts, so runtime code never sees an odd total.

Trimming is enforced in two places:

1. **`SetupPage.tsx` (manual mode, dual)**: after `handleFile` validates the JSON, and when `handleCreateGame` runs, if `teamMode === "dual"`:
   - If `totalQuestions` (sum across topics) is odd → drop the last question from the last topic (or drop the whole topic if it contains a single question).
   - If `blitzTasks.length` is odd → drop the last blitz task.
   - Show a non-blocking info message in the SetupPage UI: "В dual-режиме используется чётное число заданий: N → M".

2. **`useAiOrchestrator.ts` (AI mode, dual)**:
   - In `onAiStepSuccess("questions", ...)`: if `teamMode === "dual"` and the total number of generated questions is odd, trim the last question.
   - In `onAiStepSuccess("blitz", ...)`: if `teamMode === "dual"` and `blitzTasks.length` is odd, trim the last task. (In practice `blitzRoundsPerTeam * realTeamCount` already yields an even number when `realTeamCount === 2`, but the defensive trim is one line and cheap.)

The trimming logic is extracted to a pure helper:

```ts
// src/logic/dualModeTrim.ts
export function trimQuestionsFileForDual(
  file: QuestionsFile,
  teamMode: "single" | "dual",
): QuestionsFile
```

This keeps SetupPage and useAiOrchestrator simple, and the helper is easy to unit-test without rendering React.

### 2.3 Start validation

`canStartGame` and `canStartGameAsHost` in `src/store/actions/lobby.ts` are updated for dual mode:

- Current rule: all players `ready` + equal team sizes + every player has a team.
- New rule (dual): additionally requires `totalQuestions >= 2 || blitzTasks.length >= 2` (already trimmed to even counts by now, so "at least 2" means "at least one round per team").
- Single mode start validation unchanged.

### 2.4 `getNextPhaseAfterReview` and `round-pick`

Unchanged. Because `topics` and `blitzTasks` are already even-count arrays when dual is active, no special skip logic is needed. `round-pick` naturally only offers unplayed questions, and `getNextPhaseAfterReview` naturally transitions to blitz / finale on the correct boundary.

## 3. Action filtering for opponents

Cross-team actions must be rejected. The audit of existing action guards and the required changes:

| Action | Current guard | Change |
|---|---|---|
| `claimCaptain` | rejects non-team player | unchanged |
| `setPlayerReady` | rejects non-team player | unchanged |
| `submitAnswer` | **no team check** | add explicit team check: reject if player not in active team |
| `claimBlitzCaptain` | rejects non-team player | unchanged |
| `claimBlitzSlot` | rejects non-team player | unchanged |
| `setBlitzPlayerReady` | rejects non-team player | unchanged |
| `submitBlitzAnswer` | implicit via `playerOrder` | add explicit team check (defense in depth) |
| `skipBlitzAnswer` | implicit via `playerOrder` | add explicit team check |
| `activateJoker` | **no caller check at all** | add optional `playerName?: string` parameter; host calls with `undefined` (bypass), transport handler passes the resolved player name, function rejects if `playerName !== captainName` |
| `disputeReview` | no caller check; host-only call path today | allow from any player — already works through existing transport path; document behavior, add test |
| `confirmReview` (next-round) | no caller check | allow from any player — already works |
| `confirmBlitzReview` (next-round) | no caller check | allow from any player — already works |
| `initReview` | uses all entries in `round.answers` | defensive filter: only include players whose `team === round.teamId` in `evaluations` |

### 3.1 `activateJoker` plumbing

```ts
// src/store/actions/round.ts
export function activateJoker(playerName?: string): void {
  const state = useGameStore.getState();
  if (state.phase !== "round-pick") return;
  if (!state.currentRound) return;

  if (playerName !== undefined && playerName !== state.currentRound.captainName) {
    return;
  }

  const team = state.teams.find(t => t.id === state.currentRound!.teamId);
  if (!team || team.jokerUsed) return;

  useGameStore.getState().setState({
    currentRound: { ...state.currentRound, jokerActive: true },
  });
}
```

Host call site (`HostRound.Main.tsx`) keeps `<JokerState onClick={activateJoker} />` — no-arg call bypasses the check. Player action path in `PlayPage.tsx` is updated to resolve the peer's player name and pass it explicitly.

### 3.2 `submitAnswer` team guard

```ts
const player = state.players.find(p => p.name === playerName);
if (!player || player.team !== state.currentRound.teamId) return;
```

Placed at the top of `submitAnswer`, after the existing phase / round / duplicate-answer checks.

## 4. TaskCard visibility

Visibility rules move entirely out of `stateFilter.ts` and into `TaskCardBlock.tsx` via the existing `hidden` prop on `TaskCard`. Question and blitz-item text are never scrubbed from state; the client decides what to render. In-person play tolerates a DevTools "peek" as a trade-off for a cleaner UI and simpler filter.

### 4.1 `stateFilter.ts` simplification

Remove:
- `hideQuestionText` function and its call site.
- `hideBlitzTaskItems` function and its call site.
- `isCaptain` / `isInActiveTeam` / `isOpponent` / `isDual` locals that are only used by the removed branches.

Retain:
- `filterTopicsSuggest`
- `hideOtherAnswers`
- `hideReviewEvaluations`

Add a regression test: in dual mode, the filter does not modify `topics[i].questions[j].text` or `blitzTasks[i].items[j].text` in any phase.

### 4.2 `TaskCardBlock.tsx` visibility matrix

| Role | Round phases when open | Blitz phases when open |
|---|---|---|
| Captain | `round-active`, `round-answer`, `round-review`, `round-result` | `blitz-active`, `blitz-answer`, `blitz-review` |
| Active-team non-captain player | `round-review`, `round-result` | `blitz-review` |
| Host (no `playerName` prop) | `round-review`, `round-result` | `blitz-review` |
| Opponent (dual only) | `round-review`, `round-result` — always. In any other phase — closed by default but clickable to toggle open/closed. | `blitz-review` always; other phases — clickable toggle |

### 4.3 Opponent click-toggle

Local component state, not synced:

```tsx
const [toggleOpen, setToggleOpen] = useState(false);
useEffect(() => {
  setToggleOpen(false);
}, [round.questionIndex, round.blitzItemIndex]);
```

Reset triggers: change of `questionIndex` or `blitzItemIndex` (i.e., a new task). Phase changes do not reset the toggle — an opponent who opens the card in `round-ready` keeps it open into `round-active`.

`onClick` is wired only for opponents in non-review phases:

```tsx
const isOpponent = /* player exists, dual mode, player.team !== round.teamId */;
const isReviewPhase = /* round-review, round-result, blitz-review */;
const onClick = isOpponent && !isReviewPhase
  ? () => setToggleOpen(v => !v)
  : undefined;
```

`TaskCard` already renders the clickable visual state via `data-clickable`.

## 5. Host active-team indicator

Thin top stripe on `HostMainContainer` in the active team color. No background tint.

`HostMainContainer` reads `currentRound.teamId` and `settings.teamMode` directly from the store (it lives in `src/pages/blocks/`, not the props-only component library):

```tsx
export function HostMainContainer({ children }: Props) {
  const round = useCurrentRound();
  const teamMode = useSettings().teamMode;
  const stripeColor =
    teamMode === "dual" && round?.teamId ? round.teamId : undefined;
  return (
    <div className={styles.container} data-stripe={stripeColor}>
      {children}
    </div>
  );
}
```

CSS:

```css
.container {
  position: relative;
}
.container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: transparent;
  transition: background 200ms;
}
.container[data-stripe="red"]::before  { background: var(--color-team-red); }
.container[data-stripe="blue"]::before { background: var(--color-team-blue); }
```

Single mode, pre-game phases (`lobby`, `topics-*`), and `finale` produce no stripe.

## 6. Toolbar redesign

Single `Toolbar` component in `src/components/Toolbar/`, props-only (no `useTranslation`, no store access). Two render modes driven by the presence of the optional `player` prop.

### 6.1 Props

```ts
interface ToolbarProps {
  variant?: "inline" | "overlay";      // default "overlay"
  player?: PlayerDisplay;              // presence → PlayerToolbar mode
  phaseName?: string;                  // localized string, passed by parent
  phaseTeam?: TeamId;                  // default "none"
  players?: PlayerData[];              // required in PlayerToolbar mode
  teamLabels?: Partial<Record<TeamId, string>>; // localized group headers
  onOpenCalibration: () => void;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
}
```

### 6.2 Variants

- **`overlay`** — `position: fixed; top: 0; left: 0; right: 0; pointer-events: none` on the container, `pointer-events: auto` on interactive elements. Transparent background when closed. When a panel (menu or players list) opens, only the expanded region gets an opaque background.
- **`inline`** — `position: sticky; top: 0`, always opaque background, occupies space in the parent flow.

`variant="inline"` is used only for in-game player screens (`PlayerRound`, `PlayerBlitz`, `PlayerTopicsSuggest`). All other contexts (lobby host, lobby player, in-game host, topics-preview host, finale host) use `overlay`.

### 6.3 GameToolbar mode (no `player`)

Just a `(☰)` button in the top-right. Click opens a menu containing the calibration / fullscreen / theme buttons.

### 6.4 PlayerToolbar mode

Layout, closed:

```
[🐰 player-name | phase-name]                              [☰]
```

- Avatar: `<PlayerAvatar size={32} emoji={player.emoji} team={player.team} />`.
- Player name: colored by `player.team`.
- Separator: visual `|`.
- Phase name: colored by `phaseTeam` (or `none` default).
- `(☰)` on the right.

Click `(☰)`: name + phase slide out to the left (`transform: translateX(-100%)` + `opacity: 0`), calibration / fullscreen / theme buttons slide in from the right. Click any button or `(☰)` again to close.

Click `(🐰)` or player name: a dropdown expands below the toolbar with `<TeamGroup>` components grouped by team, read-only (display-only list). `teamLabels` strings are used as group headers.

### 6.5 Panel mutex and dismissal

```ts
const [open, setOpen] = useState<"menu" | "players" | null>(null);
```

Opening one panel closes the other. `Esc` closes any open panel. Outside-click (on `document.body` outside the toolbar element) closes any open panel. Both panels work in both variants.

### 6.6 Accessibility

- `(☰)` — `aria-expanded={open === "menu"}`, `aria-label` from parent or a built-in fallback.
- `(🐰)` — `aria-expanded={open === "players"}`, `aria-label` for "player list".
- Phase element — `aria-live="polite"`, `role="status"`.
- Long phase names — `max-width` + `text-overflow: ellipsis`, full text via `title`.

### 6.7 `GameShell` integration

`GameShell` becomes responsible for collecting i18n strings and passing them to `Toolbar`:

```ts
interface GameShellProps {
  role: CalibrationRole;
  onClockResync?: () => Promise<number>;
  children: React.ReactNode;
  player?: PlayerDisplay;
  phaseName?: string;
  phaseTeam?: TeamId;
  players?: PlayerData[];
  variant?: "inline" | "overlay";
}
```

Inside `GameShell`:
- `useTranslation()` to resolve `phaseName` from the phase id (`t("phase."+phase)`) if the caller passed a phase and did not pre-resolve it.
- Resolve `teamLabels` from i18n.
- Compose everything into `<Toolbar />` props.

Callers pass only the raw phase, team id, and player list. `Toolbar` itself remains pure and props-only.

### 6.8 Caller wiring

| Screen | variant | player | phaseName | phaseTeam | players |
|---|---|---|---|---|---|
| Lobby (host + player) | `overlay` | — | — | — | — |
| Setup / rules / join (if Toolbar is mounted there) | `overlay` | — | — | — | — |
| In-game host (`HostRound`, `HostBlitz`, `HostTopicsSuggest`, `HostFinale` later) | `overlay` | — | — | — | — |
| In-game player (`PlayerRound`, `PlayerBlitz`, `PlayerTopicsSuggest`, `PlayerFinale` later) | `inline` | `myPlayer` | phase | `round?.teamId ?? "none"` | all players |

### 6.9 New i18n namespace `phase.*`

Keys added in both `src/i18n/ru.json` and `src/i18n/en.json`:

- `phase.lobby`
- `phase.topics-collecting`, `phase.topics-generating`, `phase.topics-preview`
- `phase.round-captain`, `phase.round-pick`, `phase.round-ready`, `phase.round-active`, `phase.round-answer`, `phase.round-review`, `phase.round-result`
- `phase.blitz-captain`, `phase.blitz-pick`, `phase.blitz-ready`, `phase.blitz-active`, `phase.blitz-answer`, `phase.blitz-review`
- `phase.finale`

Wording for the Russian keys emphasizes the active activity ("Капитан выбирает задание", "Идут ответы", "Проверка", etc.). Exact strings finalized during implementation.

### 6.10 Deprecation of the old `Toolbar`

The current three-button `Toolbar` is fully replaced by the new one. Its test file and stories are rewritten.

## 7. Starting team

The team that plays first is determined by who pressed the "start" control:
- If a player pressed start → that player's team starts first.
- If the host pressed start → random team (uniform over `state.teams`).
- In single mode → `none` (degenerate case, always).

### 7.1 Manual-mode lobby start

`startGame` gains an optional parameter:

```ts
export function startGame(startingTeam?: TeamId): void
```

Implementation:
- If `startingTeam` is passed and matches one of `state.teams`, use it.
- Otherwise pick a random team from `state.teams` (uniform).
- Fall back to `"none"` if `state.teams` is empty (defensive).

`startGameAsHost` does not gain a parameter — it always uses the random path.

`PlayPage.tsx` transport handler for `{ kind: "start-game" }` resolves the peer's player name and looks up their team:

```ts
case "start-game": {
  const name = resolvePlayerName(peerId);
  const player = name ? useGameStore.getState().players.find(p => p.name === name) : undefined;
  startGame(player?.team);
  break;
}
```

`resolvePlayerName` follows the existing pattern used by other player actions in `PlayPage.tsx` (to be matched during implementation).

### 7.2 AI-mode topics-preview start

`startFirstRound(teamId?: TeamId)` in `src/store/actions/topicsSuggest.ts` already supports:
- Passed team → use it.
- Undefined → random team.

Host button `startFirstRound()` in `SidebarBlock.tsx:152` — unchanged, random.
Player action handler `PlayPage.tsx:154` calls `startFirstRound(player.team)` — unchanged.

## 8. Tests

### 8.1 Unit tests

- `src/logic/dualModeTrim.test.ts` (new)
  - Odd `topics[].questions[]` total → last question trimmed in dual, unchanged in single.
  - Last topic has one question → whole topic dropped in dual.
  - Odd `blitzTasks.length` → last task dropped in dual.
  - Single mode → no changes.

- `src/store/actions/lobby.test.ts` (additions)
  - `canStartGame` / `canStartGameAsHost` in dual: at least one of `totalQuestions >= 2 || blitzTasks.length >= 2` is required.
  - `startGame("red")` → `currentRound.teamId === "red"`.
  - `startGame(undefined)` in dual → random team (`Math.random` mocked).
  - `startGame(undefined)` in single → `"none"`.
  - `startGameAsHost()` in dual → random.

- `src/store/actions/round.test.ts` (additions)
  - `submitAnswer` from a player on the opponent team → state unchanged in dual.
  - `activateJoker("OpponentName")` → state unchanged.
  - `activateJoker("CaptainName")` → joker activated.
  - `activateJoker()` (undefined, host) → joker activated.
  - `initReview` excludes players whose team differs from `round.teamId` from `evaluations` (defensive).

- `src/store/actions/blitz.test.ts` (additions)
  - `submitBlitzAnswer` from opponent → state unchanged.
  - `skipBlitzAnswer` from opponent → state unchanged.

- `src/store/stateFilter.test.ts` (rewrites)
  - Remove existing `hideQuestionText` and `hideBlitzTaskItems` test cases.
  - Add regression test: in dual mode, the filter does not modify `topics[i].questions[j].text` or `blitzTasks[i].items[j].text` in any phase.

### 8.2 Component tests

- `src/pages/blocks/TaskCardBlock.test.tsx` (new)
  - Round mode: captain sees card open in `round-active`; active-team non-captain does not; both see it open in `round-review`.
  - Round mode: opponent in dual, `round-active` → card closed; click → open; click → closed; changing `questionIndex` → resets to closed.
  - Blitz mode: symmetric cases for `blitz-active` / `blitz-review`.
  - Host (no `playerName` prop): card open only in review phases.

- `src/components/Toolbar/Toolbar.test.tsx` (rewritten)
  - GameToolbar mode: only `(☰)` button; click opens menu; clicking a menu button calls the callback and closes the menu.
  - PlayerToolbar mode: player name in team color (verified via `data-*` attribute); phase label in active-team color; `(🐰)` opens player list.
  - Panel mutex: opening menu closes players list and vice versa.
  - `Esc` closes any open panel.
  - Outside-click on `document.body` closes any open panel.
  - `variant="inline"` vs `"overlay"` — verified via `data-variant` attribute.

- `src/pages/blocks/HostMainContainer.test.tsx` (optional, small)
  - Dual + `currentRound.teamId === "red"` → `data-stripe="red"`.
  - Single mode → no `data-stripe`.
  - Dual + phase `lobby` (no currentRound) → no `data-stripe`.

### 8.3 Stories (Ladle)

- `Toolbar.stories.tsx` (rewritten) — six stories:
  - `GameToolbar / Overlay`
  - `GameToolbar / Inline`
  - `PlayerToolbar / Overlay`
  - `PlayerToolbar / Inline`
  - `PlayerToolbar / MenuOpen`
  - `PlayerToolbar / PlayersListOpen`

### 8.4 Manual test plan

1. Dual manual: 4 questions, 2 blitzes — alternation works, per-team scores correct.
2. Dual manual: JSON with 5 questions → loaded as 4. JSON with 3 blitzes → loaded as 2.
3. Dual manual: red player presses start → red plays first. Host presses start → random team plays first (verify over several runs).
4. Dual AI: topics-suggest → rounds → blitzes → finale (finale itself covered in 9.3; verify that the game reaches it).
5. Dual: opponent sees TaskCard closed during `round-active`; click → open; click → closed.
6. Dual: opponent cannot submit an answer (UI hides input; raw `submit-answer` action from DevTools is rejected at the action layer).
7. Dual: joker — only captain of active team can activate; non-captain action is rejected at the action layer.
8. Dual: host `HostMainContainer` top stripe reflects the active team color and animates smoothly on alternation.
9. Toolbar variants: lobby is overlay + transparent; in-game player is inline + opaque; in-game host is overlay.
10. PlayerToolbar: player name in own team color, phase in active-team color; long phase names truncate cleanly.
11. Toolbar: `(☰)` menu and `(🐰)` players list are mutually exclusive; `Esc` and outside-click close any open panel.

### 8.5 E2E (deferred)

Playwright infrastructure is not present in the repo (same note as phase 9.1). E2E scenarios for dual mode are documented here for when the infrastructure is added:

- Full dual manual game from lobby to finale, verifying alternation and per-team scoring.
- Full dual AI game from topics-suggest to finale.
- Opponent cannot interact with active-team controls.

## 9. File touch list

Estimated scope, grouped by area:

- **Types / store / logic**
  - `src/store/actions/round.ts` — `activateJoker` parameter, `submitAnswer` guard, `initReview` filter
  - `src/store/actions/blitz.ts` — guards in `submitBlitzAnswer` / `skipBlitzAnswer`
  - `src/store/actions/lobby.ts` — `startGame` parameter, `canStartGame` / `canStartGameAsHost` dual rule
  - `src/store/stateFilter.ts` — remove question / blitz-item scrubbing
  - `src/logic/dualModeTrim.ts` — new helper
  - `src/pages/SetupPage.tsx` — use trim helper, info message
  - `src/hooks/useAiOrchestrator.ts` — use trim helper in AI success handlers
  - `src/pages/PlayPage.tsx` — resolve player name for `start-game`, `activate-joker`

- **Host UI**
  - `src/pages/blocks/HostMainContainer.tsx` — top stripe
  - `src/pages/blocks/HostMainContainer.module.css` — `::before` stripe
  - `src/pages/blocks/SidebarBlock.tsx` — no change (already shows active team)

- **Task card**
  - `src/pages/blocks/TaskCardBlock.tsx` — opponent toggle, host rule, drop text scrubbing dependency

- **Toolbar**
  - `src/components/Toolbar/Toolbar.tsx` — full rewrite
  - `src/components/Toolbar/Toolbar.module.css` — new layout, variants, animations
  - `src/components/Toolbar/Toolbar.test.tsx` — rewritten
  - `src/components/Toolbar/Toolbar.stories.tsx` — rewritten
  - `src/pages/GameShell.tsx` — new props, i18n collection
  - `src/pages/PlayPage.tsx` — pass player / phase / players into `GameShell`
  - `src/pages/lobby/HostLobby.tsx`, `src/pages/lobby/PlayerLobby.tsx` — pass variant="overlay" (default, may be no-op)
  - `src/i18n/ru.json`, `src/i18n/en.json` — `phase.*` namespace

- **Tests**
  - `src/store/actions/lobby.test.ts`, `round.test.ts`, `blitz.test.ts` — additions
  - `src/store/stateFilter.test.ts` — rewrites
  - `src/logic/dualModeTrim.test.ts` — new
  - `src/pages/blocks/TaskCardBlock.test.tsx` — new
  - `src/pages/blocks/HostMainContainer.test.tsx` — new (optional)
  - `src/components/Toolbar/Toolbar.test.tsx` — rewritten

## 10. Out of scope

Explicitly deferred:

- Finale screen (phase 9.3).
- Game-loop replay / reset (phase 9.4).
- Playwright E2E (repo lacks Playwright infrastructure).
- Single-mode blitz state-level text leakage (acceptable; UI hides via `hidden`, and we are removing state scrubbing entirely — trade-off accepted for cleaner architecture).
- Reconnection in dual mode (already tracked in `task/spec-p2pt-reconnection.md`).
- Spectator-specific Toolbar behavior (spectators share the host `overlay` GameToolbar mode).
