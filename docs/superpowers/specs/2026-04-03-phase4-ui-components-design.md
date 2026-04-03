# Phase 4: UI Components + Ladle Stories — Design Spec

## Overview

8 UI components per spec, all with Ladle stories. No game logic dependencies.
Components are pure visual — data comes through props, actions through callbacks.

## General Decisions

### Fonts
- **Marck Script** (Google Fonts) — handwriting text on Sticker (player answers)
- **Tektur** (Google Fonts) — task text, AI comments, stamps, scores
- Connected via `<link>` in `index.html`

### Color System (theme.css additions)
New CSS variables for team-specific backgrounds and text:
- `--color-team-red-bg` / `--color-team-red-text`
- `--color-team-blue-bg` / `--color-team-blue-text`
- `--color-team-beige-bg` / `--color-team-beige-text`
- `--color-envelope` (beige) / `--color-envelope-dark` (dark brown for labels)

### Animations (shared keyframes in theme.css or dedicated animations.css)
- `--duration-open: 0.5s` — envelope open/close
- `@keyframes rock` — rocking ±3-5deg for active states (Envelope, BlitzBox)
- `@keyframes glow-pulse` — pulsating glow for active states
- `@keyframes stamp-appear` — zoom-out stamp appearance on Sticker

### Sizing Strategy
- Components preserve `aspect-ratio`, size determined by container
- Size variants (`small`/`medium`/`large`) set concrete `width` only in stories and standalone usage

---

## Components

### 1. PlayerAvatar

**Files:** `src/components/PlayerAvatar/PlayerAvatar.tsx`, `.module.css`, `.stories.tsx`

**Props:**
```ts
{
  size: "small" | "medium" | "large";
  emoji: string;
  playerName?: string;
  team?: "red" | "blue" | "beige";
  online?: boolean; // default true
  onClick?: () => void;
}
```

**Visual:**
- Circle with team-colored border (preserved even when offline)
- Emoji centered, oversized (larger than the circle), clipped by `overflow: hidden`
- Name at bottom of circle (medium/large only), formatting:
  - Strip special chars → 2+ words: initials of first two → else: first 3 letters
- Offline: `opacity: 0.5`, grayscale filter on inner content (not border)

**Animations:**
- Emoji change: slide transition (old slides out, new slides in)

**Sizes in stories:** small ~32px, medium ~48px, large ~72px (aspect-ratio 1:1)

**Stories:** all team × size × online/offline combinations, long name, two-word name, special chars in name, emoji change demo.

---

### 2. Envelope

**Files:** `src/components/Envelope/Envelope.tsx`, `.module.css`, `.stories.tsx`

**Props:**
```ts
{
  open: boolean;
  label: string;
  paperText?: string;
  paperColor?: "red" | "blue" | "beige";
  active?: boolean;
  player?: { emoji: string; playerName: string; team: "red" | "blue" | "beige" };
  jokerUsed?: boolean;
  onClick?: () => void;
}
```

**Visual (based on `.tmp/envelope.html` reference):**
- Envelope from border-triangles (front and back walls)
- Lid from two layers with `rotateX` 3D animation
- Paper inside, color by team (`--color-team-*-bg`)
- Text on paper in `--color-team-*-text`, font Tektur

**States:**
- `open=false`: lid closed, paper hidden
- `open=true`: lid flips open (3D rotateX), paper slides up
- `active=true`: glow + rocking (`rock` + `glow-pulse`)

**Overlay elements:**
- Label (dark brown) on front wall
- PlayerAvatar (small, top-left) — optional
- Joker icon (top-right) — if `jokerUsed`

**Stories:** closed/open, active, all team colors, with/without player, with joker.

---

### 3. BlitzBox

**Files:** `src/components/BlitzBox/BlitzBox.tsx`, `.module.css`, `.stories.tsx`

**Props:**
```ts
{
  active?: boolean;
  teamColor?: "red" | "blue" | "beige";
  text?: string; // default "?"
  onClick?: () => void;
}
```

**Visual:**
- Square box (aspect-ratio 1:1), light brown cardboard-like background
- Light shadows for volume
- Text centered, font Tektur, color by `teamColor` (white if unset)
- Text has static glow effect (text-shadow)
- Text overflow visible (not clipped if wider than box)

**States:**
- Default: box with "?" or text
- `active=true`: glow + rocking (`glow-pulse` + `rock`)

**Stories:** default, active, all team colors, numeric text (scores), without teamColor.

---

### 4. Sticker

**Files:** `src/components/Sticker/Sticker.tsx`, `.module.css`, `.stories.tsx`

**Props:**
```ts
{
  player?: { emoji: string; playerName: string; team: "red" | "blue" | "beige" };
  answerText: string;
  aiComment?: string;
  stampText?: string;
  stampColor?: "green" | "red";
  onClick?: () => void;
}
```

**Visual:**
- Paper sticker, background by team (`--color-team-*-bg`)
- Crumpled paper texture via `conic-gradient` overlay (e.g. `conic-gradient(from 75deg, transparent, rgba(0,0,0,0.05))`)
- Adhesive tape strip at top (semi-transparent, slightly rotated)
- Folded corner at bottom-right (CSS triangle + shadow)
- Drop shadow underneath
- Random rotation ±3-5deg (stable per mount)

**Text:**
- Answer: font `Marck Script`, large
- AI comment: font `Tektur`, small, below answer

**Stamp (when `stampText` is set):**
- Rectangular frame with ink irregularity effect (CSS mask with noise-gradient for transparency spots)
- Text in `Tektur`, bold
- Color: green or red
- Random rotation ±5-10deg
- Appearance animation: `stamp-appear` (zoom-out, from large to normal)

**Elements:**
- PlayerAvatar (small) at top-left, slightly overlapping sticker edge

**Stories:** all team colors, with/without stamp (green/red), with/without AI comment, with/without player, long answer, short answer.

---

### 5. StickerStack

**Files:** `src/components/StickerStack/StickerStack.tsx`, `.module.css`, `.stories.tsx`

**Props:**
```ts
{
  stickers: Array<ComponentProps<typeof Sticker>>;
  onSplit?: () => void; // callback only, logic in Phase 6
}
```

**Visual:**
- **Single sticker:** renders normal Sticker without wrapper
- **Multiple:** top sticker visible, 1-2 lower sticker edges visible beneath (offset by few px, different rotation angles) — stack effect
- Count badge in top-right (circle, accent color)

**Interactivity:**
- Click on stack backdrop — cycle: top sticker goes back, next comes forward
- Click on badge — calls `onSplit`

**Stories:** single sticker, 2 stickers, 5 stickers, cycling demo.

---

### 6. TaskCard

**Files:** `src/components/TaskCard/TaskCard.tsx`, `.module.css`, `.stories.tsx`

**Props:**
```ts
{
  topic?: string;
  player?: { emoji: string; playerName: string; team: "red" | "blue" | "beige" };
  difficulty: number;
  questionText: string;
  hidden?: boolean;
  onClick?: () => void;
}
```

**Visual:**
- Glossy card with rounded corners, light gradient glare for gloss effect
- **Header:** beige background, topic centered
- **Body:** left 30% — PlayerAvatar (large, no name, no online status) + captain's full name below in team color; right 70% — question text in Tektur
- **Footer:** difficulty/points in bottom-right, Tektur

**Hidden mode (`hidden=true`):**
- Question text always in DOM (no layout shift)
- `color: transparent`, `user-select: none`
- No placeholder overlay

**Stories:** normal card, hidden, no topic, no player, various difficulty (100-400), long question text, all team colors.

---

### 7. TaskView

**Files:** `src/components/TaskView/TaskView.tsx`, `.module.css`, `.stories.tsx`

**Props:**
```ts
{
  topics: Array<{
    name: string;
    questions: Array<{
      open: boolean;
      active: boolean;
      player?: { emoji: string; playerName: string; team: "red" | "blue" | "beige" };
      jokerUsed: boolean;
      label: string;
      paperText?: string;
      paperColor?: "red" | "blue" | "beige";
    }>;
  }>;
  blitzRounds: Array<{
    active: boolean;
    teamColor?: "red" | "blue" | "beige";
    text?: string;
  }>;
  onSelectQuestion?: (topicIndex: number, questionIndex: number) => void;
  onSelectBlitz?: (blitzIndex: number) => void;
}
```

**Visual:**
- **Upper part:** Envelope grid — columns = topics (topic header on top), rows = questions by ascending difficulty
- **Lower part:** horizontal row of BlitzBox
- Grid fills available space, cells scale uniformly
- BlitzBox row below grid, equal sizing

**Stories:**
- Full grid (3 topics × 4 questions + 3 blitz rounds)
- Partially opened envelopes, one active envelope
- Active blitz box
- Questions only (no blitz)
- Blitz only (no questions)
- Empty grid

---

### 8. PlayerStatusTable

**Files:** `src/components/PlayerStatusTable/PlayerStatusTable.tsx`, `.module.css`, `.stories.tsx`

**Props:**
```ts
{
  players: Array<{
    emoji: string;
    playerName: string;
    team: "red" | "blue" | "beige";
    online: boolean;
    role: "captain" | "player" | "blitz-player" | "undefined";
    blitzOrder?: number; // 1-10 for blitz-player
    status: "answered" | "skipped" | "typing" | "waiting";
  }>;
}
```

**Visual:**
- Table with alternating row backgrounds for readability
- Each row: PlayerAvatar (small) | Name (team color) | Role (icon) | Status (icon/animation)

**Role icons:**
- Captain: crown emoji
- Player: notebook emoji
- Blitz-player: number emoji (1️⃣ 2️⃣ ... 🔟)
- Undefined: question mark emoji

**Status icons:**
- Answered: checkmark
- Skipped: X mark
- Typing: animated dots
- Waiting: empty

**Stories:** mixed roles and statuses, all offline, single team, two teams, many players (10+).

---

## Implementation Order (by dependency graph)

```
Level 1 (parallel):  PlayerAvatar, BlitzBox
Level 2 (parallel):  Envelope, Sticker, TaskCard  (depend on PlayerAvatar)
Level 3 (parallel):  StickerStack, TaskView, PlayerStatusTable  (depend on Level 1-2)
```

## File Structure

```
src/components/
  PlayerAvatar/
    PlayerAvatar.tsx
    PlayerAvatar.module.css
    PlayerAvatar.stories.tsx
  Envelope/
    Envelope.tsx
    Envelope.module.css
    Envelope.stories.tsx
  BlitzBox/
    BlitzBox.tsx
    BlitzBox.module.css
    BlitzBox.stories.tsx
  Sticker/
    Sticker.tsx
    Sticker.module.css
    Sticker.stories.tsx
  StickerStack/
    StickerStack.tsx
    StickerStack.module.css
    StickerStack.stories.tsx
  TaskCard/
    TaskCard.tsx
    TaskCard.module.css
    TaskCard.stories.tsx
  TaskView/
    TaskView.tsx
    TaskView.module.css
    TaskView.stories.tsx
  PlayerStatusTable/
    PlayerStatusTable.tsx
    PlayerStatusTable.module.css
    PlayerStatusTable.stories.tsx
```
