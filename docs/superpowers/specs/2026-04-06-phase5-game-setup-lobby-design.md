# Phase 5: Game Setup + Lobby — Design Spec

## Overview

Full flow from home page to game start: HomePage → SetupPage (game config) → PlayPage/Lobby (players join, pick teams, ready up, start).

Host on big screen (1366×768+), players on mobile (375×600+). Single URL `/play?room=<id>` — role determined by sessionStorage.

## Routing

| Route | Page | Purpose |
|-------|------|---------|
| `/` | HomePage | "New Game" button → navigate to `/setup` |
| `/setup` | SetupPage | Game settings, room creation |
| `/play?room=<id>` | PlayPage | Host or player, renders by phase |

New route: `/setup` → `SetupPage`.

### Role determination

- `sessionPersistence.isHost()` returns `true` → host mode
- Otherwise → player mode (name entry → lobby)
- Same URL shared via QR — opener is host, everyone else is player

## SetupPage (/setup)

### Layout

Centered form, max-width ~500px. Sections top-to-bottom:

1. **Team Mode** — two cards: "Одна команда" (single/coop) vs "Две команды" (dual/competitive). Toggle selection.
2. **Question Source** — two cards: "Свои вопросы" (manual, upload JSON) vs "AI генерация" (OpenRouter). Toggle selection.
3. **Manual mode** — drag-and-drop zone for JSON file upload. If constructor data exists in localStorage — auto-load with preview. JSON can be replaced.
4. **JSON Preview** — shown after file loaded: list of topics with question counts, blitz task count.
5. **AI mode** (shown instead of manual when AI selected) — API key (from localStorage), topic count (default 3), questions per topic (default 4), blitz rounds per team (default 2).
6. **"Создать игру" button** — validates, saves to sessionStorage, creates room, navigates to `/play?room=b-xxx`.

### Validation

- Manual: JSON must contain valid topics array with questions
- AI: `(topicCount × questionsPerTopic) > 0 || blitzRoundsPerTeam > 0`
- Constructor data from localStorage is treated same as uploaded JSON

### Actions on "Create Game"

1. Build `GameSettings` from form
2. For manual: parse JSON → populate `topics` and `blitzTasks` in store
3. Create teams based on `teamMode`:
   - Single: 1 team with color `"none"`
   - Dual: 2 teams — `{id: "red", color: "red"}` and `{id: "blue", color: "blue"}`
4. `saveGameState(sessionStorage)` — marks this tab as host
5. `createRoom()` via transport → roomId
6. `navigate(/play?room=${roomId})`

## PlayPage (/play?room=...)

### Architecture

```
PlayPage
  ├─ isHost? → useTransport({role:"host"})
  │   └─ switch(phase)
  │       ├─ "lobby" → <HostLobby />
  │       └─ ... (future phases)
  └─ !isHost? → Name entry → useTransport({role:"player", roomId, playerName})
      └─ switch(phase)
          ├─ "lobby" → <PlayerLobby />
          └─ ... (future phases)
```

Player name:
- Pre-filled from `localStorage` (if saved from previous game)
- Editable before joining
- Saved to `localStorage` after join

## HostLobby

### Layout (desktop)

Two-column layout:
- **Left (flex:1)**: QR code block — title, room ID, large QR code (`qrcode.react` library), join URL text
- **Right (width ~320px)**: player list + controls

### Right column (dual mode)

Three `TeamGroup` sections stacked vertically:
1. **Red team** — `border-left: red`, players in team "red"
2. **Blue team** — `border-left: blue`, players in team "blue"
3. **No team** — `border-left: grey`, players without team assignment

Each section uses adapted `PlayerStatusTable` in lobby mode.

### Right column (single mode)

One `TeamGroup` section: "Игроки" with neutral color.

### Drag & Drop (host only, dual mode)

- Native HTML Drag & Drop API (host is on desktop)
- Player rows are draggable between team sections (drop zones)
- Special "kick" drop zone at bottom — drag player there to remove from game
- Drop triggers `movePlayer(name, targetTeamId)` or `kickPlayer(name)`

### Controls (bottom of right column)

- **Калибровка button** — opens CalibrationPopup (stub until Phase 7)
- **Старт button** — disabled until all conditions met:
  - All players online
  - All players ready
  - Min 2 players per team (captain + 1 responder)
  - All players assigned to a team (dual mode)
- When disabled: tooltip/message explaining why (e.g., "Не все игроки готовы")

## PlayerLobby

### Step 1: Name Entry

- Full-screen centered form (mobile)
- Title "Loud Quiz", room ID
- Name input — pre-filled from localStorage
- "Присоединиться" button → sends `{kind: "join", name}` action (no emoji — host assigns it)
- Host assigns emoji via `getRandomEmoji(occupied)` upon receiving join action

### Step 2: Lobby

Top-to-bottom layout:

1. **Avatar** — `PlayerAvatar` component, centered, large (80px). Click to change emoji (sends `{kind: "change-emoji", emoji}`). Only available when `!ready`.
2. **Team Selection (dual mode only)** — two colored zones side by side:
   - Left zone: red gradient, shows player count (large Tektur font)
   - Right zone: blue gradient, shows player count (large Tektur font)
   - Avatar sits in center between zones
   - Hint text above avatar: `← выбери команду →`
   - Interaction: click zone OR drag avatar toward zone (pointer events for touch support)
   - After selection: avatar returns to center, changes team color (flip animation). Zone stays highlighted.
   - Can re-select by clicking/dragging again (while `!ready`)
3. **Player list** — `TeamGroup` component showing all players in room as compact view. Auto-scrolls down when new player joins. Does NOT scroll on disconnect. Scrollable area, buttons always visible below.
4. **Controls** (pinned to bottom):
   - Калибровка button (stub)
   - "Готов" button → sends `{kind: "set-ready", ready: true}`. Locks avatar and team.
   - After ready: button text changes to "Ожидаем остальных" (disabled state)

### Step 3: All Ready

- When all players are ready and conditions met:
  - "Старт" button appears (replaces "Ожидаем остальных")
  - Any ready player can press Start → sends `{kind: "start-game"}`

### Single mode differences

- No team selection UI — player auto-assigned to the single team on join
- Everything else same

## New Component: TeamGroup

Location: `src/components/TeamGroup/`

### Purpose

Reusable card displaying a group of players belonging to a team. Used in HostLobby, PlayerLobby, and future screens (finale).

### Props

```typescript
interface TeamGroupProps {
  teamId: string;
  teamColor: TeamColor;        // "red" | "blue" | "none"
  label: string;               // e.g., "Красные", "Синие", "Без команды", "Игроки"
  playerCount: number;
  children: React.ReactNode;   // PlayerStatusTable rows or compact chips
}
```

### Visual

- White card with rounded corners
- Left border colored by team (4px solid)
- Header: team label (uppercase, colored) + player count
- Content: children (player rows)

## PlayerStatusTable Adaptation

No `mode` prop needed. Reuse existing types:

### New prop

```typescript
draggable?: boolean  // enables native HTML DnD on rows (default: false)
```

### Lobby usage

- `status: "right"` → ✓ green checkmark = player is ready
- `status: "waiting"` → ⏳ orange = player not yet ready
- `role` omitted or `undefined` → role column empty (no icon)
- `draggable: true` → rows become drag handles (HostLobby in dual mode)
- `online: false` → existing grey/semi-transparent treatment

No changes to game mode — current behavior preserved as-is.

## Store Actions: `store/actions/lobby.ts`

### Host-side action handlers

```typescript
handleJoin(peerId: string, name: string): void
```
- Add player to `store.players[]`
- Assign emoji via `getRandomEmoji(occupied)` — host picks, not player
- If name already exists: replace player (base reconnect — update peerId, set online)
- Assign team: single mode → the one team; dual mode → no team (empty string)

```typescript
handleSetTeam(name: string, teamId: string): void
```
- Move player to specified team
- Only allowed when `!ready` and `phase === "lobby"`

```typescript
handleSetReady(name: string, ready: boolean): void
```
- Set `player.ready = ready`
- When ready: lock team and emoji changes

```typescript
handleChangeEmoji(name: string): void
```
- Generate new random emoji via `getRandomEmoji(occupied)`
- Update player's emoji
- Only allowed when `!ready` and `phase === "lobby"`

```typescript
kickPlayer(name: string): void
```
- Remove player from `store.players[]`
- Disconnect peer via transport

```typescript
movePlayer(name: string, teamId: string): void
```
- Host moves player between teams (drag & drop)
- Updates `player.team`

```typescript
startGame(): void
```
- Validate: all ready, min 2/team, all have team (dual)
- Transition: `phase = "topics-suggest"` (AI mode) or `phase = "round-captain"` (manual mode)

### New PlayerAction types

Modify `PlayerAction` union in `types/transport.ts`:

```typescript
// Change existing join action — remove emoji field (host assigns emoji):
| { kind: "join"; name: string }

// Add new actions:
| { kind: "change-emoji" }      // request new random emoji (host picks)
| { kind: "start-game" }        // any ready player can start when all ready
```

Note: host assigns the emoji (not the player), so `change-emoji` has no emoji field — host picks a random free one.

## Emoji Pool: `logic/emojiPool.ts`

```typescript
const EMOJI_POOL: string[] = [/* 200+ emojis from spec/ui/avatars.md */]

function getRandomEmoji(occupied: string[]): string
// Returns random emoji from EMOJI_POOL excluding occupied ones
// If all occupied (unlikely with 200+), returns random from full pool

function getShortName(name: string): string
// "Алексей Петров" → "АП" (first letters of first 2 words)
// "Маша" → "Маш" (first 3 characters)
```

## QR Code

Install `qrcode.react` npm package for QR generation in HostLobby. Renders join URL as QR code.

## i18n Keys

New keys for `ru.json` / `en.json`:

```
setup.title, setup.teamMode, setup.single, setup.dual
setup.source, setup.manual, setup.ai
setup.uploadJson, setup.replaceJson, setup.preview
setup.apiKey, setup.topicCount, setup.questionsPerTopic, setup.blitzRounds
setup.createGame, setup.validation

lobby.host.title, lobby.host.scanQr, lobby.host.roomId
lobby.host.start, lobby.host.calibration
lobby.host.notReady, lobby.host.needMorePlayers, lobby.host.needTeams
lobby.host.kickZone

lobby.player.enterName, lobby.player.join
lobby.player.chooseTeam, lobby.player.changeAvatar
lobby.player.ready, lobby.player.waiting, lobby.player.start

lobby.team.red, lobby.team.blue, lobby.team.noTeam, lobby.team.players
```

## Testing

### Unit tests

- `emojiPool.test.ts`: random excludes occupied, short name formatting
- `lobby.actions.test.ts`: join, set-team, set-ready, kick, move, start validation

### E2E tests (Broadcast Channel, single browser)

- Host creates game → sees QR in lobby
- Player joins → enters name → appears in host's player list
- Player selects team (dual) → reflected on host
- Player presses Ready → host sees status change
- Host presses Start (all conditions met) → phase transitions
- Host drags player to kick zone → player removed

### Manual testing

- Two browser tabs, full lobby flow via Broadcast Channel
