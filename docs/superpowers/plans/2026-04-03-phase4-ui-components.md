# Phase 4: UI Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 8 visual UI components with Ladle stories, independent of game logic.

**Architecture:** Pure presentational components using CSS Modules. Props for data, callbacks for actions. Shared animations and extended theme variables in `src/styles/`. Components import `TeamColor` from `@/types/game` for type safety.

**Tech Stack:** React 19, TypeScript (strict), CSS Modules (camelCase), Ladle for stories, Google Fonts (Marck Script, Tektur).

**Important notes:**
- Existing type `TeamColor = "red" | "blue" | "beige"` lives in `src/types/game.ts`
- CSS Modules use camelCase class names
- Path alias: `@/` → `src/`
- Ladle finds stories at `src/**/*.stories.tsx`
- All component exports are named (not default)

---

## File Structure

```
index.html                           — add Google Fonts link
src/styles/
  theme.css                          — extend with team bg/text vars, envelope vars
  animations.css                     — shared keyframes (rock, glow-pulse, stamp-appear)
src/components/
  PlayerAvatar/
    PlayerAvatar.tsx
    PlayerAvatar.module.css
    PlayerAvatar.stories.tsx
  BlitzBox/
    BlitzBox.tsx
    BlitzBox.module.css
    BlitzBox.stories.tsx
  Envelope/
    Envelope.tsx
    Envelope.module.css
    Envelope.stories.tsx
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

---

## Task 1: Foundation — Fonts, Theme Extensions, Shared Animations

**Files:**
- Modify: `index.html`
- Modify: `src/styles/theme.css`
- Create: `src/styles/animations.css`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add Google Fonts to index.html**

```html
<!DOCTYPE html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Marck+Script&family=Tektur:wght@400;700&display=swap"
      rel="stylesheet"
    />
    <title>Loud Quiz</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Extend theme.css with team bg/text variables and font variables**

Add to `:root` block in `src/styles/theme.css`:

```css
  /* Font families */
  --font-handwriting: "Marck Script", cursive;
  --font-display: "Tektur", system-ui, sans-serif;

  /* Team background colors (for paper, stickers) */
  --color-team-red-bg: #ffe0e0;
  --color-team-red-text: #8b1a1a;
  --color-team-blue-bg: #e0ecff;
  --color-team-blue-text: #1a3a6b;
  --color-team-beige-bg: #f5f0e8;
  --color-team-beige-text: #5d4037;

  /* Envelope colors */
  --color-envelope: #d4b896;
  --color-envelope-dark: #5d4037;
  --color-envelope-lid: #c4a67a;
  --color-envelope-lid-shadow: #b8956a;
  --color-envelope-inner: #e8d5b8;

  /* Animation durations */
  --duration-open: 0.5s;
  --duration-rock: 1.5s;
  --duration-stamp: 0.3s;
```

Add to `[data-theme="dark"]` block:

```css
  --color-team-red-bg: #4e1a1a;
  --color-team-red-text: #ffcdd2;
  --color-team-blue-bg: #1a2a4e;
  --color-team-blue-text: #bbdefb;
  --color-team-beige-bg: #3e2723;
  --color-team-beige-text: #d7ccc8;

  --color-envelope: #8d6e63;
  --color-envelope-dark: #d7ccc8;
  --color-envelope-lid: #7d5e53;
  --color-envelope-lid-shadow: #6d4e43;
  --color-envelope-inner: #5d4037;
```

- [ ] **Step 3: Create shared animations file**

Create `src/styles/animations.css`:

```css
@keyframes rock {
  0%, 100% { transform: rotate(-3deg); }
  50% { transform: rotate(3deg); }
}

@keyframes glowPulse {
  0%, 100% { box-shadow: 0 0 8px 2px rgba(255, 200, 50, 0.4); }
  50% { box-shadow: 0 0 16px 6px rgba(255, 200, 50, 0.7); }
}

@keyframes stampAppear {
  0% { transform: scale(2.5) rotate(var(--stamp-rotation, -7deg)); opacity: 0; }
  60% { transform: scale(0.9) rotate(var(--stamp-rotation, -7deg)); opacity: 1; }
  100% { transform: scale(1) rotate(var(--stamp-rotation, -7deg)); opacity: 1; }
}

@keyframes typingDots {
  0%, 20% { opacity: 0; }
  50% { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes slideInUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes slideOutUp {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-100%); opacity: 0; }
}
```

- [ ] **Step 4: Import animations in global.css**

Add to `src/styles/global.css` after the theme import:

```css
@import "./animations.css";
```

- [ ] **Step 5: Verify dev server starts**

Run: `npm run dev`
Expected: no errors, page loads

- [ ] **Step 6: Verify Ladle starts**

Run: `npm run dev:storybook`
Expected: Ladle opens with no stories yet

- [ ] **Step 7: Commit**

```bash
git add index.html src/styles/theme.css src/styles/animations.css src/styles/global.css
git commit -m "feat: add fonts, theme extensions, and shared animations for Phase 4"
```

---

## Task 2: PlayerAvatar

**Files:**
- Create: `src/components/PlayerAvatar/PlayerAvatar.tsx`
- Create: `src/components/PlayerAvatar/PlayerAvatar.module.css`
- Create: `src/components/PlayerAvatar/PlayerAvatar.stories.tsx`

**References:**
- Design spec: `docs/superpowers/specs/2026-04-03-phase4-ui-components-design.md` → PlayerAvatar section
- Types: `src/types/game.ts` → `TeamColor`
- Theme: `src/styles/theme.css` → `--color-team-*`

- [ ] **Step 1: Create PlayerAvatar.module.css**

Create `src/components/PlayerAvatar/PlayerAvatar.module.css`:

```css
.avatar {
  position: relative;
  border-radius: 50%;
  overflow: hidden;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: default;
  border: 3px solid var(--color-team-beige);
  background: var(--color-team-beige-light);
  user-select: none;
}

.avatar[data-clickable="true"] {
  cursor: pointer;
}

/* Team border colors */
.teamRed { border-color: var(--color-team-red); background: var(--color-team-red-light); }
.teamBlue { border-color: var(--color-team-blue); background: var(--color-team-blue-light); }
.teamBeige { border-color: var(--color-team-beige); background: var(--color-team-beige-light); }

/* Sizes */
.small { width: 32px; font-size: 28px; border-width: 2px; }
.medium { width: 48px; font-size: 40px; border-width: 3px; }
.large { width: 72px; font-size: 60px; border-width: 3px; }

/* Emoji container */
.emojiWrap {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.emoji {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  line-height: 1;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* Slide animation for emoji change */
.emojiEnter {
  animation: slideInUp 0.3s ease forwards;
}

.emojiExit {
  animation: slideOutUp 0.3s ease forwards;
}

/* Name label */
.name {
  position: absolute;
  bottom: 2px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.5em;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 2px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 0 0 50% 50%;
}

[data-theme="dark"] .name {
  background: rgba(0, 0, 0, 0.5);
}

/* Offline state — grayscale on inner content, border stays */
.offline .emojiWrap,
.offline .name {
  opacity: 0.5;
  filter: grayscale(100%);
}
```

- [ ] **Step 2: Create PlayerAvatar.tsx**

Create `src/components/PlayerAvatar/PlayerAvatar.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import type { TeamColor } from "@/types/game";
import styles from "./PlayerAvatar.module.css";

export interface PlayerAvatarProps {
  size: "small" | "medium" | "large";
  emoji: string;
  playerName?: string;
  team?: TeamColor;
  online?: boolean;
  onClick?: () => void;
}

function formatName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 3).toUpperCase();
}

const teamClass: Record<TeamColor, string> = {
  red: styles.teamRed,
  blue: styles.teamBlue,
  beige: styles.teamBeige,
};

export function PlayerAvatar({
  size,
  emoji,
  playerName,
  team = "beige",
  online = true,
  onClick,
}: PlayerAvatarProps) {
  const [displayedEmoji, setDisplayedEmoji] = useState(emoji);
  const [animating, setAnimating] = useState(false);
  const prevEmojiRef = useRef(emoji);

  useEffect(() => {
    if (emoji !== prevEmojiRef.current) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setDisplayedEmoji(emoji);
        setAnimating(false);
      }, 300);
      prevEmojiRef.current = emoji;
      return () => clearTimeout(timer);
    }
  }, [emoji]);

  const showName = size !== "small" && playerName;
  const cls = [
    styles.avatar,
    styles[size],
    teamClass[team],
    !online && styles.offline,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={cls}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <div className={styles.emojiWrap}>
        <span
          className={`${styles.emoji} ${animating ? styles.emojiExit : ""}`}
          key={`prev-${displayedEmoji}`}
        >
          {displayedEmoji}
        </span>
        {animating && (
          <span className={`${styles.emoji} ${styles.emojiEnter}`}>
            {emoji}
          </span>
        )}
      </div>
      {showName && <span className={styles.name}>{formatName(playerName)}</span>}
    </div>
  );
}
```

- [ ] **Step 3: Create PlayerAvatar.stories.tsx**

Create `src/components/PlayerAvatar/PlayerAvatar.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { useState } from "react";
import { PlayerAvatar } from "./PlayerAvatar";

const EMOJIS = ["👻", "🤖", "🦊", "👽", "🐙", "🎃"];

export const Sizes: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatar size="small" emoji="👻" team="red" />
    <PlayerAvatar size="medium" emoji="👻" playerName="Алексей" team="red" />
    <PlayerAvatar size="large" emoji="👻" playerName="Алексей" team="red" />
  </div>
);

export const Teams: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatar size="large" emoji="🤖" playerName="Red Player" team="red" />
    <PlayerAvatar size="large" emoji="🦊" playerName="Blue Player" team="blue" />
    <PlayerAvatar size="large" emoji="👽" playerName="Neutral" team="beige" />
  </div>
);

export const OnlineOffline: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatar size="large" emoji="👻" playerName="Online" team="red" online />
    <PlayerAvatar size="large" emoji="👻" playerName="Offline" team="red" online={false} />
    <PlayerAvatar size="large" emoji="🤖" playerName="Offline" team="blue" online={false} />
  </div>
);

export const NameFormatting: Story = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <PlayerAvatar size="large" emoji="🦊" playerName="Анна Смирнова" team="blue" />
    <PlayerAvatar size="large" emoji="🦊" playerName="Макс" team="blue" />
    <PlayerAvatar size="large" emoji="🦊" playerName="!!!Special***" team="blue" />
    <PlayerAvatar size="large" emoji="🦊" playerName="Длинное Имя Игрока" team="blue" />
  </div>
);

export const EmojiChange: Story = () => {
  const [idx, setIdx] = useState(0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
      <PlayerAvatar
        size="large"
        emoji={EMOJIS[idx % EMOJIS.length]}
        playerName="Click me"
        team="red"
        onClick={() => setIdx((i) => i + 1)}
      />
      <span style={{ fontSize: 14, color: "#888" }}>Click avatar to change emoji</span>
    </div>
  );
};

export const AllSizesAllTeams: Story = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    {(["small", "medium", "large"] as const).map((size) => (
      <div key={size} style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={{ width: 60, fontSize: 12 }}>{size}</span>
        <PlayerAvatar size={size} emoji="👻" playerName="Test" team="red" />
        <PlayerAvatar size={size} emoji="🤖" playerName="Test" team="blue" />
        <PlayerAvatar size={size} emoji="🦊" playerName="Test" team="beige" />
      </div>
    ))}
  </div>
);
```

- [ ] **Step 4: Verify in Ladle**

Run: `npm run dev:storybook`
Expected: PlayerAvatar stories visible, all variants render correctly, emoji change animation works on click.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayerAvatar/
git commit -m "feat: add PlayerAvatar component with stories"
```

---

## Task 3: BlitzBox

**Files:**
- Create: `src/components/BlitzBox/BlitzBox.tsx`
- Create: `src/components/BlitzBox/BlitzBox.module.css`
- Create: `src/components/BlitzBox/BlitzBox.stories.tsx`

**References:**
- Design spec → BlitzBox section
- Types: `src/types/game.ts` → `TeamColor`

- [ ] **Step 1: Create BlitzBox.module.css**

Create `src/components/BlitzBox/BlitzBox.module.css`:

```css
.box {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #d4b896, #c4a67a);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: visible;
  cursor: default;
  user-select: none;
}

.box[data-clickable="true"] {
  cursor: pointer;
}

/* Active state */
.active {
  animation:
    rock var(--duration-rock) ease-in-out infinite,
    glowPulse var(--duration-rock) ease-in-out infinite;
}

/* Text */
.text {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 2em;
  white-space: nowrap;
  color: white;
}

/* Text glow effect */
.text {
  text-shadow:
    0 0 8px currentColor,
    0 0 16px currentColor;
}

/* Team text colors */
.textRed { color: var(--color-team-red); }
.textBlue { color: var(--color-team-blue); }
.textBeige { color: var(--color-team-beige); }

[data-theme="dark"] .box {
  background: linear-gradient(145deg, #6d4e43, #5d3e33);
}
```

- [ ] **Step 2: Create BlitzBox.tsx**

Create `src/components/BlitzBox/BlitzBox.tsx`:

```tsx
import type { TeamColor } from "@/types/game";
import styles from "./BlitzBox.module.css";

export interface BlitzBoxProps {
  active?: boolean;
  teamColor?: TeamColor;
  text?: string;
  onClick?: () => void;
}

const textColorClass: Record<TeamColor, string> = {
  red: styles.textRed,
  blue: styles.textBlue,
  beige: styles.textBeige,
};

export function BlitzBox({
  active = false,
  teamColor,
  text = "?",
  onClick,
}: BlitzBoxProps) {
  const boxCls = [styles.box, active && styles.active]
    .filter(Boolean)
    .join(" ");

  const textCls = [styles.text, teamColor && textColorClass[teamColor]]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={boxCls}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      <span className={textCls}>{text}</span>
    </div>
  );
}
```

- [ ] **Step 3: Create BlitzBox.stories.tsx**

Create `src/components/BlitzBox/BlitzBox.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { BlitzBox } from "./BlitzBox";

export const Default: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox />
  </div>
);

export const Active: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox active />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", gap: 16 }}>
    <div style={{ width: 80 }}><BlitzBox teamColor="red" text="200" /></div>
    <div style={{ width: 80 }}><BlitzBox teamColor="blue" text="300" /></div>
    <div style={{ width: 80 }}><BlitzBox teamColor="beige" text="400" /></div>
  </div>
);

export const ActiveWithTeam: Story = () => (
  <div style={{ display: "flex", gap: 16 }}>
    <div style={{ width: 80 }}><BlitzBox active teamColor="red" text="?" /></div>
    <div style={{ width: 80 }}><BlitzBox active teamColor="blue" text="?" /></div>
  </div>
);

export const WideText: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox teamColor="red" text="1000" />
  </div>
);

export const NoTeamColor: Story = () => (
  <div style={{ width: 80 }}>
    <BlitzBox text="500" />
  </div>
);
```

- [ ] **Step 4: Verify in Ladle**

Run: `npm run dev:storybook`
Expected: BlitzBox stories visible. Square aspect ratio. Text glow visible. Active animation (rock + glow). Wide text overflows visibly.

- [ ] **Step 5: Commit**

```bash
git add src/components/BlitzBox/
git commit -m "feat: add BlitzBox component with stories"
```

---

## Task 4: Envelope

**Files:**
- Create: `src/components/Envelope/Envelope.tsx`
- Create: `src/components/Envelope/Envelope.module.css`
- Create: `src/components/Envelope/Envelope.stories.tsx`

**References:**
- Design spec → Envelope section
- Reference: `.tmp/envelope.html` — 3D lid animation technique
- Uses: `PlayerAvatar` from Task 2

- [ ] **Step 1: Create Envelope.module.css**

Create `src/components/Envelope/Envelope.module.css`:

```css
.wrapper {
  position: relative;
  display: flex;
  justify-content: center;
  aspect-ratio: 3 / 2;
  z-index: 0;
  cursor: default;
  perspective: 600px;
}

.wrapper[data-clickable="true"] {
  cursor: pointer;
}

/* Active state */
.active {
  animation:
    rock var(--duration-rock) ease-in-out infinite,
    glowPulse var(--duration-rock) ease-in-out infinite;
}

/* Lid layers — based on .tmp/envelope.html technique */
.lid {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  border-right: calc(50%) solid transparent;
  border-bottom: calc(50%) solid transparent;
  border-left: calc(50%) solid transparent;
  transform-origin: top;
  transition: transform 0.25s linear;
}

/* Lid front (visible when closed) */
.lidFront {
  border-top: calc(50%) solid var(--color-envelope-lid);
  transform: rotateX(0deg);
  z-index: 3;
  transition-delay: calc(var(--duration-open) * 0.75);
}

/* Lid back (visible when opening) */
.lidBack {
  border-top: calc(50%) solid var(--color-envelope-lid-shadow);
  transform: rotateX(90deg);
  z-index: 1;
  transition-delay: calc(var(--duration-open) * 0.5);
}

/* Open state */
.open .lidFront {
  transform: rotateX(90deg);
  transition-delay: 0s;
}

.open .lidBack {
  transform: rotateX(180deg);
  transition-delay: calc(var(--duration-open) * 0.25);
}

/* Envelope body (front triangles) */
.body {
  position: absolute;
  height: 100%;
  width: 100%;
  top: 0;
  left: 0;
  border-top: calc(50%) solid transparent;
  border-right: calc(50%) solid var(--color-envelope);
  border-bottom: calc(50%) solid var(--color-envelope);
  border-left: calc(50%) solid var(--color-envelope-inner);
  z-index: 3;
}

/* Letter/paper */
.letter {
  position: absolute;
  top: 10%;
  width: 80%;
  height: 75%;
  border-radius: 6px;
  z-index: 2;
  transition: transform var(--duration-open) ease;
  transition-delay: calc(var(--duration-open) * 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-sm);
}

.open .letter {
  transform: translateY(-40%);
  transition-delay: calc(var(--duration-open) * 0.5);
}

/* Paper team colors */
.paperRed { background: var(--color-team-red-bg); }
.paperBlue { background: var(--color-team-blue-bg); }
.paperBeige { background: var(--color-team-beige-bg); }

.paperText {
  font-family: var(--font-display);
  font-size: 0.75em;
  text-align: center;
  word-break: break-word;
}

.paperRed .paperText { color: var(--color-team-red-text); }
.paperBlue .paperText { color: var(--color-team-blue-text); }
.paperBeige .paperText { color: var(--color-team-beige-text); }

/* Label on front of envelope */
.label {
  position: absolute;
  bottom: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  font-family: var(--font-display);
  font-size: 0.6em;
  color: var(--color-envelope-dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80%;
  text-align: center;
}

/* Player avatar overlay */
.playerOverlay {
  position: absolute;
  top: -4px;
  left: -4px;
  z-index: 5;
}

/* Joker icon overlay */
.jokerOverlay {
  position: absolute;
  top: -4px;
  right: -4px;
  z-index: 5;
  font-size: 1.2em;
}
```

- [ ] **Step 2: Create Envelope.tsx**

Create `src/components/Envelope/Envelope.tsx`:

```tsx
import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./Envelope.module.css";

export interface EnvelopePlayer {
  emoji: string;
  playerName: string;
  team: TeamColor;
}

export interface EnvelopeProps {
  open: boolean;
  label: string;
  paperText?: string;
  paperColor?: TeamColor;
  active?: boolean;
  player?: EnvelopePlayer;
  jokerUsed?: boolean;
  onClick?: () => void;
}

const paperClass: Record<TeamColor, string> = {
  red: styles.paperRed,
  blue: styles.paperBlue,
  beige: styles.paperBeige,
};

export function Envelope({
  open,
  label,
  paperText,
  paperColor = "beige",
  active = false,
  player,
  jokerUsed = false,
  onClick,
}: EnvelopeProps) {
  const wrapperCls = [
    styles.wrapper,
    open && styles.open,
    active && styles.active,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={wrapperCls}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      {/* Lid layers */}
      <div className={`${styles.lid} ${styles.lidFront}`} />
      <div className={`${styles.lid} ${styles.lidBack}`} />

      {/* Envelope body */}
      <div className={styles.body} />

      {/* Letter/paper */}
      <div className={`${styles.letter} ${paperClass[paperColor]}`}>
        {paperText && <span className={styles.paperText}>{paperText}</span>}
      </div>

      {/* Label */}
      <span className={styles.label}>{label}</span>

      {/* Player avatar */}
      {player && (
        <div className={styles.playerOverlay}>
          <PlayerAvatar
            size="small"
            emoji={player.emoji}
            team={player.team}
          />
        </div>
      )}

      {/* Joker icon */}
      {jokerUsed && <span className={styles.jokerOverlay}>🃏</span>}
    </div>
  );
}
```

- [ ] **Step 3: Create Envelope.stories.tsx**

Create `src/components/Envelope/Envelope.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { useState } from "react";
import { Envelope } from "./Envelope";

const player = { emoji: "👻", playerName: "Алексей", team: "red" as const };

export const ClosedAndOpen: Story = () => (
  <div style={{ display: "flex", gap: 24 }}>
    <div style={{ width: 150 }}>
      <Envelope open={false} label="100" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open label="100" paperText="Что тяжелее: 1 кг железа или 1 кг ваты?" paperColor="red" />
    </div>
  </div>
);

export const Toggle: Story = () => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: 200 }}>
      <Envelope
        open={open}
        label="200"
        paperText="Какое животное самое быстрое?"
        paperColor="blue"
        onClick={() => setOpen((o) => !o)}
      />
      <p style={{ marginTop: 8, fontSize: 12, color: "#888" }}>Click to toggle</p>
    </div>
  );
};

export const Active: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open={false} label="300" active />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", gap: 24 }}>
    <div style={{ width: 150 }}>
      <Envelope open label="100" paperText="Красная тема" paperColor="red" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open label="100" paperText="Синяя тема" paperColor="blue" />
    </div>
    <div style={{ width: 150 }}>
      <Envelope open label="100" paperText="Нейтральная" paperColor="beige" />
    </div>
  </div>
);

export const WithPlayer: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open label="100" paperText="С аватаром" paperColor="red" player={player} />
  </div>
);

export const WithJoker: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open label="200" paperText="С джокером" paperColor="blue" jokerUsed />
  </div>
);

export const WithPlayerAndJoker: Story = () => (
  <div style={{ width: 150 }}>
    <Envelope open label="200" paperText="Полный" paperColor="red" player={player} jokerUsed />
  </div>
);
```

- [ ] **Step 4: Verify in Ladle**

Run: `npm run dev:storybook`
Expected: Envelope stories visible. 3D lid animation on toggle. Paper slides up when open. Active glow + rock. Player avatar and joker icon positioned correctly.

- [ ] **Step 5: Commit**

```bash
git add src/components/Envelope/
git commit -m "feat: add Envelope component with 3D lid animation and stories"
```

---

## Task 5: Sticker

**Files:**
- Create: `src/components/Sticker/Sticker.tsx`
- Create: `src/components/Sticker/Sticker.module.css`
- Create: `src/components/Sticker/Sticker.stories.tsx`

**References:**
- Design spec → Sticker section
- Uses: `PlayerAvatar` from Task 2

- [ ] **Step 1: Create Sticker.module.css**

Create `src/components/Sticker/Sticker.module.css`:

```css
.sticker {
  position: relative;
  padding: 32px 16px 20px;
  border-radius: 2px;
  box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.2);
  cursor: default;
  /* Crumpled paper texture */
  background-image: conic-gradient(from 75deg, transparent, rgba(0, 0, 0, 0.04)),
    conic-gradient(from 200deg, transparent 60%, rgba(0, 0, 0, 0.03)),
    conic-gradient(from 320deg, transparent 40%, rgba(0, 0, 0, 0.02));
  background-size: 100% 100%, 80% 80%, 120% 120%;
  background-position: center, 30% 70%, 60% 20%;
}

.sticker[data-clickable="true"] {
  cursor: pointer;
}

/* Team backgrounds */
.teamRed { background-color: var(--color-team-red-bg); }
.teamBlue { background-color: var(--color-team-blue-bg); }
.teamBeige { background-color: var(--color-team-beige-bg); }

/* Adhesive tape strip */
.tape {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(-2deg);
  width: 60%;
  height: 20px;
  background: rgba(255, 255, 200, 0.5);
  border: 1px solid rgba(200, 200, 150, 0.3);
  z-index: 1;
}

/* Folded corner */
.foldedCorner {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  background: linear-gradient(
    135deg,
    transparent 50%,
    rgba(0, 0, 0, 0.05) 50%,
    rgba(0, 0, 0, 0.1)
  );
  box-shadow: -2px -2px 3px rgba(0, 0, 0, 0.05);
}

/* Player avatar overlay */
.playerOverlay {
  position: absolute;
  top: -8px;
  left: -8px;
  z-index: 2;
}

/* Answer text */
.answerText {
  font-family: var(--font-handwriting);
  font-size: 1.3em;
  line-height: 1.3;
  word-break: break-word;
}

.teamRed .answerText { color: var(--color-team-red-text); }
.teamBlue .answerText { color: var(--color-team-blue-text); }
.teamBeige .answerText { color: var(--color-team-beige-text); }

/* AI comment */
.aiComment {
  font-family: var(--font-display);
  font-size: 0.75em;
  margin-top: var(--spacing-sm);
  opacity: 0.7;
  color: var(--color-text-secondary);
}

/* Stamp */
.stamp {
  position: absolute;
  bottom: 20px;
  right: 16px;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1.1em;
  padding: 4px 10px;
  border: 3px solid;
  border-radius: 3px;
  text-transform: uppercase;
  /* Ink irregularity via mask */
  mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3Crect width='100%25' height='100%25' opacity='0.6'/%3E%3C/svg%3E");
  mask-size: cover;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.85'/%3E%3Crect width='100%25' height='100%25' opacity='0.6'/%3E%3C/svg%3E");
  -webkit-mask-size: cover;
  animation: stampAppear var(--duration-stamp) ease-out forwards;
}

.stampGreen {
  color: var(--color-success);
  border-color: var(--color-success);
}

.stampRed {
  color: var(--color-error);
  border-color: var(--color-error);
}
```

- [ ] **Step 2: Create Sticker.tsx**

Create `src/components/Sticker/Sticker.tsx`:

```tsx
import { useMemo } from "react";
import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./Sticker.module.css";

export interface StickerPlayer {
  emoji: string;
  playerName: string;
  team: TeamColor;
}

export interface StickerProps {
  player?: StickerPlayer;
  answerText: string;
  aiComment?: string;
  stampText?: string;
  stampColor?: "green" | "red";
  onClick?: () => void;
}

const teamClass: Record<TeamColor, string> = {
  red: styles.teamRed,
  blue: styles.teamBlue,
  beige: styles.teamBeige,
};

const stampColorClass = {
  green: styles.stampGreen,
  red: styles.stampRed,
};

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function Sticker({
  player,
  answerText,
  aiComment,
  stampText,
  stampColor = "green",
  onClick,
}: StickerProps) {
  const rotation = useMemo(() => randomRange(-4, 4), []);
  const stampRotation = useMemo(() => randomRange(-10, 10), []);
  const team = player?.team ?? "beige";

  return (
    <div
      className={`${styles.sticker} ${teamClass[team]}`}
      style={{ transform: `rotate(${rotation}deg)` }}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      {/* Tape */}
      <div className={styles.tape} />

      {/* Player avatar */}
      {player && (
        <div className={styles.playerOverlay}>
          <PlayerAvatar size="small" emoji={player.emoji} team={player.team} />
        </div>
      )}

      {/* Answer */}
      <p className={styles.answerText}>{answerText}</p>

      {/* AI comment */}
      {aiComment && <p className={styles.aiComment}>{aiComment}</p>}

      {/* Stamp */}
      {stampText && (
        <div
          className={`${styles.stamp} ${stampColorClass[stampColor]}`}
          style={{ "--stamp-rotation": `${stampRotation}deg` } as React.CSSProperties}
        >
          {stampText}
        </div>
      )}

      {/* Folded corner */}
      <div className={styles.foldedCorner} />
    </div>
  );
}
```

- [ ] **Step 3: Create Sticker.stories.tsx**

Create `src/components/Sticker/Sticker.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { Sticker } from "./Sticker";

const redPlayer = { emoji: "👻", playerName: "Алексей", team: "red" as const };
const bluePlayer = { emoji: "🤖", playerName: "Мария", team: "blue" as const };

export const CorrectAnswer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker
      player={redPlayer}
      answerText="Гепард"
      stampText="+200"
      stampColor="green"
    />
  </div>
);

export const WrongAnswer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker
      player={bluePlayer}
      answerText="Лев"
      stampText="Неверно"
      stampColor="red"
    />
  </div>
);

export const WithAIComment: Story = () => (
  <div style={{ width: 250 }}>
    <Sticker
      player={redPlayer}
      answerText="Сокол-сапсан"
      aiComment="Технически самая быстрая птица, но вопрос был о наземных животных"
      stampText="Неправильно"
      stampColor="red"
    />
  </div>
);

export const NoStamp: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker player={redPlayer} answerText="Жду проверки..." />
  </div>
);

export const NoPlayer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker answerText="Анонимный ответ" stampText="+100" stampColor="green" />
  </div>
);

export const LongAnswer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker
      player={bluePlayer}
      answerText="Это очень длинный ответ который должен переноситься на несколько строк"
      stampText="+300"
      stampColor="green"
    />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
    <div style={{ width: 200 }}>
      <Sticker player={redPlayer} answerText="Красная команда" stampText="+100" stampColor="green" />
    </div>
    <div style={{ width: 200 }}>
      <Sticker player={bluePlayer} answerText="Синяя команда" stampText="Нет" stampColor="red" />
    </div>
    <div style={{ width: 200 }}>
      <Sticker
        player={{ emoji: "🦊", playerName: "Лиса", team: "beige" }}
        answerText="Без команды"
        stampText="+50"
        stampColor="green"
      />
    </div>
  </div>
);
```

- [ ] **Step 4: Verify in Ladle**

Run: `npm run dev:storybook`
Expected: Sticker stories visible. Crumpled paper texture. Tape at top. Folded corner. Random rotation on each mount. Stamp with ink irregularity effect. Stamp appears with zoom-out animation.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sticker/
git commit -m "feat: add Sticker component with stamp and paper effects"
```

---

## Task 6: TaskCard

**Files:**
- Create: `src/components/TaskCard/TaskCard.tsx`
- Create: `src/components/TaskCard/TaskCard.module.css`
- Create: `src/components/TaskCard/TaskCard.stories.tsx`

**References:**
- Design spec → TaskCard section
- Uses: `PlayerAvatar` from Task 2

- [ ] **Step 1: Create TaskCard.module.css**

Create `src/components/TaskCard/TaskCard.module.css`:

```css
.card {
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  /* Glossy effect */
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.15) 0%,
    transparent 40%,
    transparent 100%
  ), var(--color-bg);
  cursor: default;
}

.card[data-clickable="true"] {
  cursor: pointer;
}

/* Header — topic */
.header {
  background: var(--color-team-beige-bg);
  padding: var(--spacing-sm) var(--spacing-md);
  text-align: center;
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-team-beige-text);
  border-bottom: 1px solid var(--color-border);
}

/* Body */
.body {
  display: flex;
  padding: var(--spacing-md);
  gap: var(--spacing-md);
  min-height: 80px;
}

/* Left column — captain */
.captain {
  width: 30%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
}

.captainName {
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  text-align: center;
  word-break: break-word;
}

.captainNameRed { color: var(--color-team-red); }
.captainNameBlue { color: var(--color-team-blue); }
.captainNameBeige { color: var(--color-team-beige); }

/* Right column — question */
.question {
  flex: 1;
  font-family: var(--font-display);
  font-size: var(--font-size-md);
  line-height: 1.4;
  color: var(--color-text);
  word-break: break-word;
}

.hidden {
  color: transparent;
  user-select: none;
}

/* Footer — difficulty */
.footer {
  padding: var(--spacing-xs) var(--spacing-md) var(--spacing-sm);
  text-align: right;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-lg);
  color: var(--color-text-secondary);
}
```

- [ ] **Step 2: Create TaskCard.tsx**

Create `src/components/TaskCard/TaskCard.tsx`:

```tsx
import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./TaskCard.module.css";

export interface TaskCardPlayer {
  emoji: string;
  playerName: string;
  team: TeamColor;
}

export interface TaskCardProps {
  topic?: string;
  player?: TaskCardPlayer;
  difficulty: number;
  questionText: string;
  hidden?: boolean;
  onClick?: () => void;
}

const nameColorClass: Record<TeamColor, string> = {
  red: styles.captainNameRed,
  blue: styles.captainNameBlue,
  beige: styles.captainNameBeige,
};

export function TaskCard({
  topic,
  player,
  difficulty,
  questionText,
  hidden = false,
  onClick,
}: TaskCardProps) {
  return (
    <div
      className={styles.card}
      data-clickable={onClick ? "true" : undefined}
      onClick={onClick}
    >
      {topic && <div className={styles.header}>{topic}</div>}

      <div className={styles.body}>
        {player && (
          <div className={styles.captain}>
            <PlayerAvatar size="large" emoji={player.emoji} team={player.team} />
            <span className={`${styles.captainName} ${nameColorClass[player.team]}`}>
              {player.playerName}
            </span>
          </div>
        )}
        <div className={`${styles.question} ${hidden ? styles.hidden : ""}`}>
          {questionText}
        </div>
      </div>

      <div className={styles.footer}>{difficulty}</div>
    </div>
  );
}
```

- [ ] **Step 3: Create TaskCard.stories.tsx**

Create `src/components/TaskCard/TaskCard.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { TaskCard } from "./TaskCard";

const redCaptain = { emoji: "👻", playerName: "Алексей", team: "red" as const };
const blueCaptain = { emoji: "🤖", playerName: "Мария Иванова", team: "blue" as const };

export const Default: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Животные"
      player={redCaptain}
      difficulty={200}
      questionText="Какое животное является самым быстрым на суше?"
    />
  </div>
);

export const Hidden: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Животные"
      player={redCaptain}
      difficulty={200}
      questionText="Какое животное является самым быстрым на суше?"
      hidden
    />
  </div>
);

export const NoTopic: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      player={blueCaptain}
      difficulty={300}
      questionText="Назовите столицу Бразилии"
    />
  </div>
);

export const NoPlayer: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="География"
      difficulty={100}
      questionText="Какая страна самая большая по площади?"
    />
  </div>
);

export const LongText: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Наука"
      player={redCaptain}
      difficulty={400}
      questionText="Объясните принцип работы ядерного реактора на тяжёлой воде и его отличия от реактора на лёгкой воде с точки зрения эффективности использования топлива"
    />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ width: 400 }}>
      <TaskCard topic="Тема" player={redCaptain} difficulty={100} questionText="Красная команда" />
    </div>
    <div style={{ width: 400 }}>
      <TaskCard topic="Тема" player={blueCaptain} difficulty={200} questionText="Синяя команда" />
    </div>
    <div style={{ width: 400 }}>
      <TaskCard
        topic="Тема"
        player={{ emoji: "🦊", playerName: "Лиса", team: "beige" }}
        difficulty={300}
        questionText="Без команды"
      />
    </div>
  </div>
);

export const Difficulties: Story = () => (
  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
    {[100, 200, 300, 400].map((d) => (
      <div key={d} style={{ width: 280 }}>
        <TaskCard topic="Тема" player={redCaptain} difficulty={d} questionText={`Вопрос за ${d} очков`} />
      </div>
    ))}
  </div>
);
```

- [ ] **Step 4: Verify in Ladle**

Run: `npm run dev:storybook`
Expected: TaskCard stories visible. Glossy card effect. Left 30% with large avatar. Hidden text invisible but card size unchanged. All team colors for captain name.

- [ ] **Step 5: Commit**

```bash
git add src/components/TaskCard/
git commit -m "feat: add TaskCard component with stories"
```

---

## Task 7: StickerStack

**Files:**
- Create: `src/components/StickerStack/StickerStack.tsx`
- Create: `src/components/StickerStack/StickerStack.module.css`
- Create: `src/components/StickerStack/StickerStack.stories.tsx`

**References:**
- Design spec → StickerStack section
- Uses: `Sticker` from Task 5

- [ ] **Step 1: Create StickerStack.module.css**

Create `src/components/StickerStack/StickerStack.module.css`:

```css
.stack {
  position: relative;
  cursor: pointer;
}

/* Background sticker layers peeking out */
.backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.5;
  pointer-events: none;
}

.backdrop:nth-child(1) {
  transform: translate(3px, 3px) rotate(2deg);
}

.backdrop:nth-child(2) {
  transform: translate(6px, 5px) rotate(-1.5deg);
}

/* Top sticker */
.top {
  position: relative;
  z-index: 2;
}

/* Count badge */
.badge {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 10;
  min-width: 24px;
  height: 24px;
  border-radius: 12px;
  background: var(--color-primary);
  color: white;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
}

.badge:hover {
  background: var(--color-primary-light);
}
```

- [ ] **Step 2: Create StickerStack.tsx**

Create `src/components/StickerStack/StickerStack.tsx`:

```tsx
import { useState, type ComponentProps } from "react";
import { Sticker } from "@/components/Sticker/Sticker";
import styles from "./StickerStack.module.css";

export interface StickerStackProps {
  stickers: ComponentProps<typeof Sticker>[];
  onSplit?: () => void;
}

export function StickerStack({ stickers, onSplit }: StickerStackProps) {
  const [topIndex, setTopIndex] = useState(0);

  if (stickers.length === 0) return null;

  if (stickers.length === 1) {
    return <Sticker {...stickers[0]} />;
  }

  const current = stickers[topIndex % stickers.length];

  function handleCycle(e: React.MouseEvent) {
    // Don't cycle if clicking the badge
    if ((e.target as HTMLElement).closest(`.${styles.badge}`)) return;
    setTopIndex((i) => i + 1);
  }

  function handleBadgeClick(e: React.MouseEvent) {
    e.stopPropagation();
    onSplit?.();
  }

  return (
    <div className={styles.stack} onClick={handleCycle}>
      {/* Background layers (max 2) */}
      {stickers.slice(0, 2).map((_, i) => (
        <div key={i} className={styles.backdrop} />
      ))}

      {/* Top sticker */}
      <div className={styles.top}>
        <Sticker {...current} />
      </div>

      {/* Badge */}
      <div className={styles.badge} onClick={handleBadgeClick}>
        {stickers.length}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create StickerStack.stories.tsx**

Create `src/components/StickerStack/StickerStack.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import type { ComponentProps } from "react";
import type { Sticker } from "@/components/Sticker/Sticker";
import { StickerStack } from "./StickerStack";

const makeSticker = (
  name: string,
  emoji: string,
  answer: string,
  team: "red" | "blue" | "beige" = "red",
): ComponentProps<typeof Sticker> => ({
  player: { emoji, playerName: name, team },
  answerText: answer,
  stampText: "+100",
  stampColor: "green",
});

export const Single: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack stickers={[makeSticker("Алексей", "👻", "Гепард")]} />
  </div>
);

export const TwoStickers: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack
      stickers={[
        makeSticker("Алексей", "👻", "Гепард"),
        makeSticker("Мария", "🤖", "Гепард"),
      ]}
    />
  </div>
);

export const FiveStickers: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack
      stickers={[
        makeSticker("Алексей", "👻", "Гепард"),
        makeSticker("Мария", "🤖", "Гепард"),
        makeSticker("Иван", "🦊", "Гепард"),
        makeSticker("Ольга", "👽", "Гепард"),
        makeSticker("Пётр", "🐙", "Гепард"),
      ]}
      onSplit={() => alert("Split!")}
    />
  </div>
);

export const MixedTeams: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack
      stickers={[
        makeSticker("Красный", "👻", "Ответ", "red"),
        makeSticker("Синий", "🤖", "Ответ", "blue"),
        makeSticker("Бежевый", "🦊", "Ответ", "beige"),
      ]}
    />
  </div>
);
```

- [ ] **Step 4: Verify in Ladle**

Run: `npm run dev:storybook`
Expected: StickerStack stories visible. Single sticker renders plain. Multiple stickers show backdrop edges and badge. Clicking cycles through stickers. Badge click triggers onSplit.

- [ ] **Step 5: Commit**

```bash
git add src/components/StickerStack/
git commit -m "feat: add StickerStack component with cycling and stories"
```

---

## Task 8: TaskView

**Files:**
- Create: `src/components/TaskView/TaskView.tsx`
- Create: `src/components/TaskView/TaskView.module.css`
- Create: `src/components/TaskView/TaskView.stories.tsx`

**References:**
- Design spec → TaskView section
- Uses: `Envelope` from Task 4, `BlitzBox` from Task 3

- [ ] **Step 1: Create TaskView.module.css**

Create `src/components/TaskView/TaskView.module.css`:

```css
.container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  width: 100%;
}

/* Topic headers */
.topicHeaders {
  display: grid;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-sm);
}

.topicHeader {
  text-align: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  padding: var(--spacing-xs) 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Questions grid */
.grid {
  display: grid;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-sm);
}

.cell {
  min-width: 0;
}

/* Blitz row */
.blitzRow {
  display: flex;
  gap: var(--spacing-sm);
  padding: 0 var(--spacing-sm);
  justify-content: center;
}

.blitzCell {
  width: 60px;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Create TaskView.tsx**

Create `src/components/TaskView/TaskView.tsx`:

```tsx
import type { TeamColor } from "@/types/game";
import { Envelope, type EnvelopePlayer } from "@/components/Envelope/Envelope";
import { BlitzBox } from "@/components/BlitzBox/BlitzBox";
import styles from "./TaskView.module.css";

export interface TaskViewQuestion {
  open: boolean;
  active: boolean;
  player?: EnvelopePlayer;
  jokerUsed: boolean;
  label: string;
  paperText?: string;
  paperColor?: TeamColor;
}

export interface TaskViewTopic {
  name: string;
  questions: TaskViewQuestion[];
}

export interface TaskViewBlitz {
  active: boolean;
  teamColor?: TeamColor;
  text?: string;
}

export interface TaskViewProps {
  topics: TaskViewTopic[];
  blitzRounds: TaskViewBlitz[];
  onSelectQuestion?: (topicIndex: number, questionIndex: number) => void;
  onSelectBlitz?: (blitzIndex: number) => void;
}

export function TaskView({
  topics,
  blitzRounds,
  onSelectQuestion,
  onSelectBlitz,
}: TaskViewProps) {
  const colCount = topics.length || 1;
  const maxRows = Math.max(1, ...topics.map((t) => t.questions.length));
  const gridCols = `repeat(${colCount}, 1fr)`;

  return (
    <div className={styles.container}>
      {/* Topic headers */}
      {topics.length > 0 && (
        <div className={styles.topicHeaders} style={{ gridTemplateColumns: gridCols }}>
          {topics.map((topic, ti) => (
            <div key={ti} className={styles.topicHeader}>
              {topic.name}
            </div>
          ))}
        </div>
      )}

      {/* Envelope grid */}
      {topics.length > 0 && (
        <>
          {Array.from({ length: maxRows }, (_, row) => (
            <div key={row} className={styles.grid} style={{ gridTemplateColumns: gridCols }}>
              {topics.map((topic, ti) => {
                const q = topic.questions[row];
                if (!q) return <div key={ti} className={styles.cell} />;
                return (
                  <div key={ti} className={styles.cell}>
                    <Envelope
                      open={q.open}
                      label={q.label}
                      paperText={q.paperText}
                      paperColor={q.paperColor}
                      active={q.active}
                      player={q.player}
                      jokerUsed={q.jokerUsed}
                      onClick={
                        onSelectQuestion
                          ? () => onSelectQuestion(ti, row)
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}

      {/* Blitz row */}
      {blitzRounds.length > 0 && (
        <div className={styles.blitzRow}>
          {blitzRounds.map((blitz, bi) => (
            <div key={bi} className={styles.blitzCell}>
              <BlitzBox
                active={blitz.active}
                teamColor={blitz.teamColor}
                text={blitz.text}
                onClick={onSelectBlitz ? () => onSelectBlitz(bi) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create TaskView.stories.tsx**

Create `src/components/TaskView/TaskView.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "./TaskView";

function makeQuestion(label: string, open = false, active = false) {
  return {
    open,
    active,
    jokerUsed: false,
    label,
    paperText: open ? `Ответ на вопрос за ${label}` : undefined,
    paperColor: "red" as const,
  };
}

const topics: TaskViewTopic[] = [
  {
    name: "Животные",
    questions: [
      makeQuestion("100", true),
      makeQuestion("200"),
      makeQuestion("300"),
      makeQuestion("400"),
    ],
  },
  {
    name: "География",
    questions: [
      makeQuestion("100"),
      makeQuestion("200", true),
      makeQuestion("300", false, true),
      makeQuestion("400"),
    ],
  },
  {
    name: "Наука",
    questions: [
      makeQuestion("100"),
      makeQuestion("200"),
      makeQuestion("300"),
      makeQuestion("400", true),
    ],
  },
];

const blitz: TaskViewBlitz[] = [
  { active: false, teamColor: "red", text: "200" },
  { active: false, teamColor: "blue", text: "?" },
  { active: false, text: "?" },
];

export const FullGrid: Story = () => (
  <div style={{ width: 600 }}>
    <TaskView
      topics={topics}
      blitzRounds={blitz}
      onSelectQuestion={(t, q) => console.log("question", t, q)}
      onSelectBlitz={(b) => console.log("blitz", b)}
    />
  </div>
);

export const ActiveBlitz: Story = () => (
  <div style={{ width: 600 }}>
    <TaskView
      topics={topics}
      blitzRounds={[
        { active: false, teamColor: "red", text: "200" },
        { active: true, teamColor: "blue", text: "?" },
        { active: false, text: "?" },
      ]}
    />
  </div>
);

export const QuestionsOnly: Story = () => (
  <div style={{ width: 600 }}>
    <TaskView topics={topics} blitzRounds={[]} />
  </div>
);

export const BlitzOnly: Story = () => (
  <div style={{ width: 400 }}>
    <TaskView
      topics={[]}
      blitzRounds={[
        { active: false, teamColor: "red", text: "200" },
        { active: true, teamColor: "blue", text: "?" },
        { active: false, teamColor: "red", text: "400" },
        { active: false, text: "?" },
      ]}
    />
  </div>
);

export const WithPlayerAndJoker: Story = () => {
  const player = { emoji: "👻", playerName: "Алексей", team: "red" as const };
  const topicsWithPlayer: TaskViewTopic[] = [
    {
      name: "Тема",
      questions: [
        { ...makeQuestion("100", true), player, jokerUsed: true, paperColor: "red" },
        makeQuestion("200"),
      ],
    },
  ];
  return (
    <div style={{ width: 300 }}>
      <TaskView topics={topicsWithPlayer} blitzRounds={[]} />
    </div>
  );
};

export const Empty: Story = () => (
  <div style={{ width: 400 }}>
    <TaskView topics={[]} blitzRounds={[]} />
  </div>
);
```

- [ ] **Step 4: Verify in Ladle**

Run: `npm run dev:storybook`
Expected: TaskView stories visible. Grid layout with topic headers. Envelopes clickable. Blitz row below grid. Active blitz with glow. Questions-only and blitz-only variants correct.

- [ ] **Step 5: Commit**

```bash
git add src/components/TaskView/
git commit -m "feat: add TaskView component with stories"
```

---

## Task 9: PlayerStatusTable

**Files:**
- Create: `src/components/PlayerStatusTable/PlayerStatusTable.tsx`
- Create: `src/components/PlayerStatusTable/PlayerStatusTable.module.css`
- Create: `src/components/PlayerStatusTable/PlayerStatusTable.stories.tsx`

**References:**
- Design spec → PlayerStatusTable section
- Uses: `PlayerAvatar` from Task 2

- [ ] **Step 1: Create PlayerStatusTable.module.css**

Create `src/components/PlayerStatusTable/PlayerStatusTable.module.css`:

```css
.table {
  width: 100%;
  border-collapse: collapse;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
}

.row:nth-child(even) {
  background: var(--color-bg-secondary);
}

.avatarCell {
  flex-shrink: 0;
}

.nameCell {
  flex: 1;
  font-weight: 600;
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nameRed { color: var(--color-team-red); }
.nameBlue { color: var(--color-team-blue); }
.nameBeige { color: var(--color-team-beige); }

.roleCell {
  flex-shrink: 0;
  font-size: 1.2em;
  width: 28px;
  text-align: center;
}

.statusCell {
  flex-shrink: 0;
  font-size: 1.2em;
  width: 28px;
  text-align: center;
}

/* Typing dots animation */
.typingDots {
  display: inline-flex;
  gap: 2px;
}

.typingDots span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  animation: typingDots 1.4s infinite;
}

.typingDots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typingDots span:nth-child(3) {
  animation-delay: 0.4s;
}
```

- [ ] **Step 2: Create PlayerStatusTable.tsx**

Create `src/components/PlayerStatusTable/PlayerStatusTable.tsx`:

```tsx
import type { TeamColor } from "@/types/game";
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./PlayerStatusTable.module.css";

export type PlayerRole = "captain" | "player" | "blitz-player" | "undefined";
export type PlayerStatus = "answered" | "skipped" | "typing" | "waiting";

export interface PlayerStatusRow {
  emoji: string;
  playerName: string;
  team: TeamColor;
  online: boolean;
  role: PlayerRole;
  blitzOrder?: number;
  status: PlayerStatus;
}

export interface PlayerStatusTableProps {
  players: PlayerStatusRow[];
}

const BLITZ_NUMBER_EMOJIS = [
  "", "1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣",
  "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟",
];

function roleIcon(role: PlayerRole, blitzOrder?: number): string {
  switch (role) {
    case "captain": return "👑";
    case "player": return "📝";
    case "blitz-player": return BLITZ_NUMBER_EMOJIS[blitzOrder ?? 1] || `${blitzOrder}`;
    case "undefined": return "❓";
  }
}

function StatusDisplay({ status }: { status: PlayerStatus }) {
  switch (status) {
    case "answered": return <>✅</>;
    case "skipped": return <>❌</>;
    case "typing":
      return (
        <span className={styles.typingDots}>
          <span />
          <span />
          <span />
        </span>
      );
    case "waiting": return null;
  }
}

const nameColorClass: Record<TeamColor, string> = {
  red: styles.nameRed,
  blue: styles.nameBlue,
  beige: styles.nameBeige,
};

export function PlayerStatusTable({ players }: PlayerStatusTableProps) {
  return (
    <div className={styles.table}>
      {players.map((p, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.avatarCell}>
            <PlayerAvatar
              size="small"
              emoji={p.emoji}
              team={p.team}
              online={p.online}
            />
          </div>
          <div className={`${styles.nameCell} ${nameColorClass[p.team]}`}>
            {p.playerName}
          </div>
          <div className={styles.roleCell}>
            {roleIcon(p.role, p.blitzOrder)}
          </div>
          <div className={styles.statusCell}>
            <StatusDisplay status={p.status} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create PlayerStatusTable.stories.tsx**

Create `src/components/PlayerStatusTable/PlayerStatusTable.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { PlayerStatusTable, type PlayerStatusRow } from "./PlayerStatusTable";

const mixedPlayers: PlayerStatusRow[] = [
  { emoji: "👻", playerName: "Алексей", team: "red", online: true, role: "captain", status: "waiting" },
  { emoji: "🤖", playerName: "Мария", team: "red", online: true, role: "player", status: "answered" },
  { emoji: "🦊", playerName: "Иван", team: "red", online: true, role: "player", status: "typing" },
  { emoji: "👽", playerName: "Ольга", team: "blue", online: true, role: "player", status: "waiting" },
  { emoji: "🐙", playerName: "Пётр", team: "blue", online: false, role: "player", status: "waiting" },
];

export const MixedStatuses: Story = () => (
  <div style={{ width: 320 }}>
    <PlayerStatusTable players={mixedPlayers} />
  </div>
);

export const BlitzRoles: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", playerName: "Капитан", team: "red", online: true, role: "captain", status: "waiting" },
    { emoji: "🤖", playerName: "Первый", team: "red", online: true, role: "blitz-player", blitzOrder: 1, status: "answered" },
    { emoji: "🦊", playerName: "Второй", team: "red", online: true, role: "blitz-player", blitzOrder: 2, status: "typing" },
    { emoji: "👽", playerName: "Третий", team: "red", online: true, role: "blitz-player", blitzOrder: 3, status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const AllOffline: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", playerName: "Алексей", team: "red", online: false, role: "player", status: "waiting" },
    { emoji: "🤖", playerName: "Мария", team: "blue", online: false, role: "player", status: "waiting" },
    { emoji: "🦊", playerName: "Иван", team: "red", online: false, role: "undefined", status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const SingleTeam: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", playerName: "Алексей", team: "red", online: true, role: "captain", status: "waiting" },
    { emoji: "🤖", playerName: "Мария", team: "red", online: true, role: "player", status: "answered" },
    { emoji: "🦊", playerName: "Иван", team: "red", online: true, role: "player", status: "answered" },
    { emoji: "👽", playerName: "Ольга", team: "red", online: true, role: "player", status: "skipped" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const ManyPlayers: Story = () => {
  const names = ["Анна", "Борис", "Вера", "Георгий", "Дарья", "Евгений", "Жанна", "Захар", "Ирина", "Кирилл"];
  const emojis = ["👻", "🤖", "🦊", "👽", "🐙", "🎃", "🦄", "🐸", "🦋", "🐯"];
  const players: PlayerStatusRow[] = names.map((name, i) => ({
    emoji: emojis[i],
    playerName: name,
    team: i < 5 ? "red" as const : "blue" as const,
    online: i !== 4 && i !== 9,
    role: i === 0 ? "captain" as const : "player" as const,
    status: (["answered", "typing", "waiting", "skipped"] as const)[i % 4],
  }));
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};

export const UndefinedRoles: Story = () => {
  const players: PlayerStatusRow[] = [
    { emoji: "👻", playerName: "Новый 1", team: "beige", online: true, role: "undefined", status: "waiting" },
    { emoji: "🤖", playerName: "Новый 2", team: "beige", online: true, role: "undefined", status: "waiting" },
  ];
  return (
    <div style={{ width: 320 }}>
      <PlayerStatusTable players={players} />
    </div>
  );
};
```

- [ ] **Step 4: Verify in Ladle**

Run: `npm run dev:storybook`
Expected: PlayerStatusTable stories visible. Alternating row backgrounds. Role icons correct (crown, notebook, number emojis, question mark). Typing animation shows animated dots. Offline avatars greyed out.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlayerStatusTable/
git commit -m "feat: add PlayerStatusTable component with stories"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run TypeScript type check**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 2: Run existing tests**

Run: `npm run test`
Expected: All existing tests pass (no regressions)

- [ ] **Step 3: Verify all stories in Ladle**

Run: `npm run dev:storybook`
Expected: All 8 component story groups visible, all stories render without errors.

- [ ] **Step 4: Update plan file**

Update `task/plan-01-init.md` Phase 4 section: mark all items `[x]` and add **Выполнено** subsection.

- [ ] **Step 5: Commit**

```bash
git add task/plan-01-init.md
git commit -m "feat: complete Phase 4 — UI components with Ladle stories"
```
