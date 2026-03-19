# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LoudQuiz** is a real-time multiplayer party quiz game. Players wear headphones with music (can't hear each other), and a captain explains questions using only gestures/mime. A host device (large screen) manages the game; players use mobile devices.

The full technical specification is in [spec/plan.md](spec/plan.md) (Russian, ~1000 lines). Consult it for detailed game rules, phase transitions, scoring formulas, and AI integration.

## Commands

> The project is in pre-initialization state (Phase 0 not yet started). Once initialized, these commands apply:

```bash
npm run dev        # Vite dev server (accessible on local network via host: true)
npm run build      # Production build → dist/ (deploys to GitHub Pages)
npm run test       # Run vitest unit tests
npm run test:watch # Watch mode
npm run lint       # ESLint
npm run format     # Prettier
```

Install varhub-web-client specifically via: `npm install github:flinbein/varhub-web-client`

## Architecture

### Roles
- **Host** — large screen, holds authoritative `FullGameState`, manages all game logic
- **Player** — mobile device, sends events, receives filtered `PublicGameState`
- **Spectator** — mobile device, receives same view as host but read-only

### VarHub Communication (WebSocket relay)
All real-time communication goes through `varhub.flinbein.ru`. VarHub is a pure relay — no server-side logic. The host browser tab is the authoritative game server.

```
Host creates room → gets roomId → shares via QR code
Players join(roomId) → VarHub relays → Host receives connectionOpen → sends syncState
Players send events (join, setTeam, submitAnswer...) → Host processes → broadcasts PublicGameState to all
```

Key VarHub patterns:
- Host: `hub.createRoomSocket({ integrity: "custom:loudquiz" })`
- Player: `hub.join(roomId, { integrity: "custom:loudquiz" })`
- Host broadcasts to all: `room.broadcast(...)`
- Host sends to one: `connection.send(...)` (used for captain's secret question text)

### Game State Split
The host stores `FullGameState` (includes all question texts, all answers). Players receive only `PublicGameState` (no question text — only the captain gets it privately). This prevents cheating.

### Clock Synchronization
Players' device clocks may differ from the host by seconds. Timers use NTP-style offset correction:
1. Client sends `ping` with `t1`, host replies immediately with `pong` containing `t2`
2. Client calculates `clockOffset = t2 - t1 - rtt/2`
3. Each broadcast includes `serverNow`, client refines offset via EWMA: `clockOffset = clockOffset * 0.9 + rawOffset * 0.1`
4. Timer display: `getRemaining(endsAt) = Math.max(0, endsAt - (Date.now() + clockOffset))`

### Routes
| URL | Page |
|-----|------|
| `/` | Home — create room or enter room code |
| `/constructor` | Standalone question editor (independent of game) |
| `/{roomId}` | Player / Spectator screen |
| `/{roomId}/host` | Host screen |

### Project Structure (planned)
```
src/
├── pages/          # HomePage, ConstructorPage, PlayerPage, HostPage
├── components/
│   ├── host/       # Host-specific UI
│   ├── player/     # Player-specific UI
│   ├── constructor/# Question editor UI
│   └── shared/     # Timer, QR code, etc.
├── game/
│   ├── types.ts    # All TypeScript types (GameState, GamePhase, etc.)
│   ├── GameLogic.ts# Phase transitions (runs on host)
│   ├── scoring.ts  # Score calculation
│   └── ai/
│       ├── prompts.ts  # AI prompt templates
│       └── aiHost.ts   # OpenRouter API integration
├── varhub/
│   └── useVarHub.ts    # VarHub connection hook
└── audio/
    └── AudioManager.ts # Background music + ring signals + WakeLock
```

### Game Phases (state machine, host-authoritative)
`lobby` → `calibration` → `topic-suggest` (AI) or `question-setup` (human) → round phases → `finale`

Round phases: `round-captain` → `round-ready` → `round-pick` → `round-active` → `round-answer` → `round-review` (human only) → `round-result`

Blitz phases: `blitz-captain` → `blitz-ready` → `blitz-pick` → `blitz-active` → `blitz-answer` → `blitz-result`

### Scoring
- Standard round: `score = difficulty × uniqueCorrectAnswers`
- Joker mechanic: each team has 1 joker per game; activating it doubles points for that round (if score > 0)
- Blitz: chain-based — consecutive correct answers multiply; bonus multiplier if all answer before timer ends

### Persistence
| Data | Storage | Key |
|------|---------|-----|
| Player name/role in room | `sessionStorage` | `player:{roomId}` |
| Last entered name | `localStorage` | `lastPlayerName` |
| OpenRouter API key | `localStorage` | `openrouterApiKey` |
| VarHub backend URL | `localStorage` | `backendUrl` |
| Constructor editor state | `localStorage` | `constructorState` |
| Live game state | VarHub (host-in-memory + sessionStorage backup) | — |

`sessionStorage` is intentional — allows multiple browser tabs as separate players for testing.

### AI Integration
- Provider: OpenRouter (`@openrouter/sdk`)
- API key stored in `localStorage` (`openrouterApiKey`), also available in `.env` as `OPENROUTER_API_KEY`
- Used for: topic selection, question generation, answer verification (in AI-host mode)
- Constructor page also supports step-by-step AI generation (topics → questions → blitz tasks)

### Question JSON Format
```typescript
interface QuestionsFile {
  topics: Topic[];          // each topic has questions[]
  blitzTasks?: BlitzTask[]; // optional blitz round tasks
}
```
Questions have: `id`, `text`, `difficulty` (100–200, multiples of 10), optional `hint` (for human host), optional `acceptedAnswers` (for AI verification).
Blitz tasks have: `id`, `text`, `difficulty` (200–400), `answer` (exact, case-insensitive, ё/е treated equally).

## Development Phases

See [spec/plan.md](spec/plan.md) Part II for the 9-phase roadmap. Completed phases are marked with `✅`.
