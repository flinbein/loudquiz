# Phase 9.3: Finale

## Overview

Presentation phase shown after all rounds and blitz rounds are complete.
Displays final scores, winner announcement, and data-driven player nominations in a carousel.

AI-generated nominations are out of scope (backlog).

## Data: Extended `RoundResult`

### New type `PlayerRoundResult`

```typescript
interface PlayerRoundResult {
  playerName: string;
  answerText: string;       // "" if player did not answer
  correct: boolean | null;  // true/false/null (not evaluated)
  answerTime: number;       // ms from timer start (Infinity if no answer)
  groupIndex: number;       // index in groups[] (-1 if not in a group)
}
```

### Extended `RoundResult`

Existing fields remain unchanged. New fields added:

```typescript
interface RoundResult {
  // existing
  type: "round" | "blitz";
  teamId: TeamId;
  captainName: string;
  questionIndex?: number;
  blitzTaskIndex?: number;
  score: number;
  jokerUsed: boolean;

  // new
  playerResults: PlayerRoundResult[];
  difficulty: number;
  topicIndex: number;
  bonusTimeApplied: boolean;
  bonusTime: number;              // remaining time in ms
  bonusTimeMultiplier: number;    // 1 + bonusTime / totalTime
  groups: string[][];
}
```

### Where data is collected

`confirmReview()` and `confirmBlitzReview()` in `src/store/actions/` are updated to populate the new fields from `currentRound.answers`, `currentRound.reviewResult`, and the question/topic metadata before clearing `currentRound`.

For blitz rounds, `playerResults` contains entries for each player in `playerOrder`; `answerTime` is relative to that player's item start.

## Nominations

### Types

```typescript
// src/logic/nominations/types.ts

interface Nomination {
  id: string;                    // "sniper", "philosopher", etc.
  emoji: string;                 // "🎯"
  titleKey: string;              // i18n key for nomination name
  descriptionKey: string;        // i18n key for nomination description
  winners: PlayerDisplay[];      // one or more winners
  stat?: string;                 // formatted metric value, e.g. "92%"
}

interface NominationRule {
  id: string;
  emoji: string;
  titleKey: string;
  descriptionKey: string;
  tieStrategy: "skip" | "all" | "random";
  compute: (ctx: NominationContext) => NominationCandidate[] | null;
}

interface NominationContext {
  history: RoundResult[];
  players: PlayerData[];
  topics: Topic[];
}

interface NominationCandidate {
  playerName: string;
  value: number;
  statLabel: string;             // formatted value for display
}
```

### Computation

Pure function in `src/logic/nominations/index.ts`:

```typescript
function computeNominations(
  history: RoundResult[],
  players: PlayerData[],
  topics: Topic[]
): Nomination[]
```

Algorithm:
1. Iterates over `NOMINATION_RULES` array
2. Each rule's `compute()` returns sorted candidates or `null` (nomination not applicable)
3. If one leader — they win
4. If multiple leaders with same `value` — apply `tieStrategy`:
   - `"skip"` — nomination not awarded
   - `"all"` — all leaders win
   - `"random"` — pick one at random
5. Filters out `null` results

### File structure

```
src/logic/nominations/
  index.ts              — computeNominations(), NOMINATION_RULES array
  types.ts              — type definitions
  rules/
    sniper.ts           — Sniper (highest correct %)
    miss.ts             — Miss (lowest correct %)
    flawless.ts         — Flawless (100% correct)
    erudite.ts          — Erudite (correct in most topics)
    quickDraw.ts        — Quick Draw (fastest avg answer time)
    philosopher.ts      — Philosopher (slowest avg answer time)
    captainsDaughter.ts — Captain's Daughter (most first answers)
    sinkTheShip.ts      — Sink the Ship (solo wrong answer most often)
    captainObvious.ts   — Captain Obvious (highest captain score)
    captainFail.ts      — Captain Fail (lowest captain score)
    eternalCaptain.ts   — Eternal Captain (most captainships)
    ambitious.ts        — Ambitious (highest avg difficulty as captain)
    cautious.ts         — Cautious (lowest avg difficulty as captain)
    goldMine.ts         — Gold Mine (most total points as captain)
    riskyPlayer.ts      — Risky Player (successful joker use)
    unluckyGambler.ts   — Unlucky Gambler (joker used, round scored 0)
    jackpot.ts          — Jackpot (highest single round score)
    iDontPlay.ts        — I Don't Play (most empty/surrendered answers)
    longestAnswer.ts    — Longest Answer (highest avg answer length)
    typewriter.ts       — Typewriter (highest total answer length)
    brevity.ts          — Brevity (lowest total correct answer length)
    narrowSpecialist.ts — Narrow Specialist (correct in only one topic)
    blitzMaster.ts      — Blitz Master (most blitz points)
    sayMyName.ts        — Say My Name (wrote another player's name)
    artist.ts           — Artist (most emoji in answers)
    mentalConnection.ts — Mental Connection (correct answer counted as duplicate)
    stuckRecord.ts      — Stuck Record (same answer across multiple rounds)
    interviewer.ts      — Interviewer (most "?" in answers)
    robot.ts            — Robot (binary answer: only "0" and "1", length >= 2)
    spy.ts              — Spy (answer >3 chars with no letters or digits)
```

Each file exports a single `NominationRule` object.

### Nomination list

| #  | ID               | Emoji | Title (ru)                 | Description                                                                                                           | Tie strategy |
|----|------------------|-------|----------------------------|-----------------------------------------------------------------------------------------------------------------------|--------------|
| 1  | sniper           | 🎯    | Снайпер                    | Самый высокий % правильных ответов                                                                                    | skip         |
| 2  | miss             | ❌     | Мимо кассы                 | Самый низкий % правильных ответов                                                                                     | skip         |
| 3  | flawless         | ✨     | Безупречный                | 100% правильных ответов                                                                                               | all          |
| 4  | erudite          | 📚    | Эрудит                     | Правильные ответы в наибольшем числе тем                                                                              | skip         |
| 5  | quickDraw        | ⚡     | Самая быстрая рука         | Самое быстрое среднее время ответа (пустые ответы не считаются)                                                       | skip         |
| 6  | philosopher      | 🤔    | Философ                    | Самое медленное среднее время ответа (пустые ответы не считаются)                                                     | skip         |
| 7  | captainsDaughter | 👩‍✈️ | Капитанская дочка          | Чаще всех отвечал первым, не будучи капитаном                                                                         | skip         |
| 8  | sinkTheShip      | 🚢    | На дно!                    | Единственный неправильный ответ в раунде (чаще всех)                                                                  | skip         |
| 9  | captainObvious   | 🧢    | Капитан очевидность        | Капитан с наибольшим суммарным счётом                                                                                 | skip         |
| 10 | captainFail      | 😬    | Капитан неудача            | Капитан с наименьшим суммарным счётом                                                                                 | skip         |
| 11 | eternalCaptain   | 👑    | Вечный капитан             | Был капитаном больше всех раз                                                                                         | skip         |
| 12 | ambitious        | 🥂    | Выше амбиций               | Капитан, чаще выбиравший сложные вопросы (высокая средняя difficulty)                                                 | skip         |
| 13 | cautious         | 🛡️   | Осторожный                 | Капитан, чаще выбиравший лёгкие вопросы (низкая средняя difficulty)                                                   | skip         |
| 14 | goldMine         | 💰    | Золотая жила               | Наибольшее количество очков команде в роли капитана                                                                   | skip         |
| 15 | riskyPlayer      | 🎲    | Рисковый игрок             | Успешно использовал джокер (больше 50% правильных уникальных ответов)                                                 | all          |
| 16 | unluckyGambler   | 🃏    | Азартный неудачник         | Использовал джокер, раунд провалился (меньше 50% правильных уникальных ответов)                                       | all          |
| 17 | jackpot          | 🎰    | Джекпот                    | Максимальный счёт за один раунд                                                                                       | all          |
| 18 | iDontPlay        | 🏳️   | Я не играю                 | Чаще всех сдавался (пустой ответ)                                                                                     | skip         |
| 19 | longestAnswer    | 📝    | Самый длинный ответ        | Наибольшая средняя длина текста ответа                                                                                | random       |
| 20 | typewriter       | 🖨️   | Печатная машина            | Наибольшая суммарная длина всех ответов                                                                               | random       |
| 21 | brevity          | 🩳    | Краткость — сестра таланта | Наименьшая суммарная длина верных ответов                                                                             | random       |
| 22 | narrowSpecialist | 🪠    | Узкий специалист           | Верные ответы только в одной категории (сравниваем суммарную сложность вопросов, на которые был верный ответ)         | skip          |
| 23 | blitzMaster      | ⚡     | Блиц-мастер                | Больше всего очков в блиц-раундах                                                                                     | skip         |
| 24 | sayMyName        | ⚗️    | Say my name                | Написал в ответе имя другого игрока (ответ содержит имя игрока)                                                       | skip         |
| 25 | artist           | 🎨    | Художник                   | Чаще всех использовал эмодзи в ответах (по количеству эмодзи)                                                         | skip         |
| 26 | mentalConnection | 🧠    | Ментальная связь           | Чаще всех давал верный ответ, который засчитывался как дубль                                                          | skip         |
| 27 | stuckRecord      | 🔄    | Заело пластинку            | Дал одинаковые ответы на несколько раундов (не пустой, хотя бы 1 из ответов верный, сравнивать по количеству ответов) | skip         |
| 28 | interviewer      | 🎤    | Интервьюер                 | использовал символ "?" в ответе больше всех раз                                                                       | all         |
| 29 | robot            | 🤖    | Робот                      | Дал ответ в двоичной системе (не менее 2 символов, содержит только символы "0", "1")                                  | all         |
| 30 | spy              | 🕵️   | Шпион                      | Дал ответ длиной >3, не используя цифры или буквы (например, "@***!!+-")                                              | all         |

### Nomination details

**Speed nominations (quickDraw, philosopher, captainsDaughter):**
Captain's own answer time is excluded from their stats — only non-captain answers count.
Empty answers (no answer submitted) are excluded from time calculations.

**sinkTheShip:**
Counts rounds where exactly one player answered incorrectly and the rest were correct. The player who was the solo incorrect answerer most often wins.

**ambitious / cautious:**
Computed as average `difficulty` across rounds where the player was captain. `ambitious` = highest average, `cautious` = lowest average.

**goldMine:**
Sum of `score` from all `RoundResult` entries where the player was `captainName`.

**riskyPlayer:**
Captain who used joker and more than 50% of answers were correct and unique. Awarded to each qualifying captain.

**unluckyGambler:**
Captain who used joker and fewer than 50% of answers were correct and unique. Awarded to each qualifying captain.

**jackpot:**
Captain of the round with the highest single `score` value across all history.

**narrowSpecialist:**
Player whose correct answers span exactly one `topicIndex`. Only awarded if the game had 2+ topics. When multiple players qualify, compare by total difficulty sum of their correct answers — highest wins.

**sayMyName:**
Any player whose `answerText` contains the `name` of another player (case-insensitive substring match).

**artist:**
Count of emoji characters across all `answerText` values. Player with the highest count wins. Only awarded if count > 0.

**mentalConnection:**
Counts how often a player gave a correct answer that was placed in a group with 2+ players (i.e. their correct answer was a duplicate of another correct answer). Player with the most such occurrences wins.

**stuckRecord:**
Player who gave the same non-empty answer text in multiple different rounds. At least one of those answers must be correct. Compare by the number of times the repeated answer appears. Case-insensitive comparison.

**interviewer:**
Total count of "?" characters across all `answerText` values. Awarded to every player with count > 0.

**robot:**
Awarded to any player who submitted an answer consisting only of "0" and "1" characters, with length >= 2.

**spy:**
Awarded to any player who submitted an answer with length > 3 that contains no letters (any script) and no digits.

## UI

### Host screen (`HostFinale`)

Located at `src/pages/finale/HostFinale.tsx`.

Structure:
- `Toolbar` — phase name "Финал"
- `FinaleScoreboard` — winner announcement + `TeamScore`
- `NominationCarousel` — carousel of nomination slides

#### `FinaleScoreboard` (`src/pages/finale/FinaleScoreboard.tsx`)

- Dual mode: "Победа красных!" / "Победа синих!" / "Ничья!" + `TeamScore`
- Single mode: "Игра окончена!" + `TeamScore`

#### `NominationCarousel` (`src/components/NominationCarousel/`)

- `NominationCarousel.tsx` — carousel container
- `NominationSlide.tsx` — single slide
- `NominationCarousel.module.css` — styles
- `NominationCarousel.stories.tsx` — Ladle stories
- `NominationCarousel.test.tsx` — tests

Carousel behavior:
- Auto-advances every 8 seconds
- Manual nav resets the 8s timer
- Click on carousel toggles play/pause
- Navigation arrows ◀ ▶ on sides
- Progress indicator (dots) at bottom
- Stops auto-advance on last slide, sets `isPlaying = false`

Each slide shows:
- Nomination emoji (large)
- Nomination title
- Winner `PlayerAvatar` (reused component)
- Stat value (e.g. "92%")
- Nomination description

### Player screen (`PlayerFinale`)

Located at `src/pages/finale/PlayerFinale.tsx`.

Minimal, read-only:
- `Toolbar` — phase name "Финал"
- "Игра окончена!" text
- `TeamScore` — final scores
- Winner announcement (dual mode) or nothing extra (single mode)

### Hook: `useCarousel`

Located at `src/hooks/useCarousel.ts`.

```typescript
function useCarousel(totalSlides: number, intervalMs?: number): {
  current: number;
  isPlaying: boolean;
  next: () => void;
  prev: () => void;
  goTo: (i: number) => void;
  togglePlay: () => void;
}
```

- `intervalMs` defaults to 8000
- Manual navigation resets the interval timer
- Auto-advance stops at last slide

## Integration

### Phase transition

No changes needed. `getNextPhaseAfterReview()` already returns `"finale"` when all rounds are played.

### `confirmReview()` / `confirmBlitzReview()` changes

Extend `RoundResult` construction to include:
- `playerResults` — built from `currentRound.answers` + `reviewResult.evaluations`
- `difficulty` — from `topics[topicIdx].questions[qIdx].difficulty` (round) or `blitzTasks[idx].items[itemIdx].difficulty` (blitz)
- `topicIndex` — computed from `questionIndex` and topic structure
- `bonusTimeApplied`, `bonusTime`, `bonusTimeMultiplier` — from `reviewResult`
- `groups` — from `reviewResult.groups`

### Routing (`PlayPage.tsx`)

Add phase check for `"finale"`:
- Host renders `HostFinale`
- Player renders `PlayerFinale`

### i18n

New keys in `src/i18n/{en,ru}.json`:

```
finale.victory        — "Победа {{team}}!" / "{{team}} wins!"
finale.draw           — "Ничья!" / "It's a draw!"
finale.gameOver        — "Игра окончена!" / "Game over!"
finale.nomination.<id>.title       — nomination title
finale.nomination.<id>.description — nomination description
```

## Tests

| File | What it tests |
|---|---|
| `src/logic/nominations/rules/*.test.ts` | Each nomination rule in isolation |
| `src/logic/nominations/index.test.ts` | `computeNominations` integration (tie strategies, filtering) |
| `src/hooks/useCarousel.test.ts` | Hook logic (auto-advance, pause, navigation, edge cases) |
| `src/components/NominationCarousel/NominationCarousel.test.tsx` | Carousel rendering, slide transitions, controls |
| `src/pages/finale/HostFinale.test.tsx` | Host finale page rendering |
| `src/pages/finale/PlayerFinale.test.tsx` | Player finale page rendering |

## Out of scope

- AI-generated nominations (backlog)
- "Play again" / return to lobby (phase 9.4)
- Tiebreaker round on draw
- Animations / confetti / sound effects
