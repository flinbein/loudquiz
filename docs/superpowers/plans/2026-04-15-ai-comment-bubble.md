# AI Comment Bubble Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `TODO: AI COMMENT` stub in `HostRound.Main.tsx` with a polished speech-bubble component that renders the AI's round commentary with a typewriter animation.

**Architecture:** Two components under `src/components/`:
- `AiAvatar/` — emoji-based avatar (🤖), sized via parent's `font-size` (em units, no props).
- `AiCommentBubble/` — speech bubble with AI avatar + typewriter-animated comment. Typewriter driven imperatively via `useRef` + `textContent` (no re-renders per char). A transparent "ghost" text layer in a CSS Grid stack holds the final bubble size so layout doesn't reflow during animation.

**Tech Stack:** React 19 + TypeScript (strict), CSS Modules, Vitest + Testing Library, Ladle stories.

**Spec reference:** `docs/superpowers/specs/2026-04-15-ai-comment-bubble-design.md`

---

## File Structure

**New files:**
- `src/components/AiAvatar/AiAvatar.tsx`
- `src/components/AiAvatar/AiAvatar.module.css`
- `src/components/AiAvatar/AiAvatar.stories.tsx`
- `src/components/AiCommentBubble/AiCommentBubble.tsx`
- `src/components/AiCommentBubble/AiCommentBubble.module.css`
- `src/components/AiCommentBubble/AiCommentBubble.stories.tsx`
- `src/components/AiCommentBubble/AiCommentBubble.test.tsx`

**Modified files:**
- `src/pages/round/HostRound.Main.tsx` (replace stub at line ~106)

---

## Task 1: AiAvatar component

**Files:**
- Create: `src/components/AiAvatar/AiAvatar.tsx`
- Create: `src/components/AiAvatar/AiAvatar.module.css`
- Create: `src/components/AiAvatar/AiAvatar.stories.tsx`

### - [ ] Step 1: Create CSS module

Create `src/components/AiAvatar/AiAvatar.module.css`:

```css
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8em;
  height: 1.8em;
  border-radius: 50%;
  background: var(--color-surface);
  border: 0.08em solid var(--color-border, rgba(0, 0, 0, 0.15));
  box-shadow: 0 0.05em 0.15em rgba(0, 0, 0, 0.1);
  line-height: 1;
  user-select: none;
}

.emoji {
  font-size: 1.1em;
  line-height: 1;
}
```

All dimensions in `em` — size follows parent `font-size`.

### - [ ] Step 2: Create component

Create `src/components/AiAvatar/AiAvatar.tsx`:

```tsx
import styles from "./AiAvatar.module.css";

export function AiAvatar() {
  return (
    <span className={styles.avatar} role="img" aria-label="AI">
      <span className={styles.emoji}>🤖</span>
    </span>
  );
}
```

No props. Size is driven by parent `font-size`.

### - [ ] Step 3: Create Ladle story

Create `src/components/AiAvatar/AiAvatar.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { AiAvatar } from "./AiAvatar";

export const Default: Story = () => (
  <div style={{ fontSize: 24 }}>
    <AiAvatar />
  </div>
);

export const SizesViaParentFontSize: Story = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
    {[14, 20, 32, 48, 72].map((size) => (
      <div key={size} style={{ fontSize: size }}>
        <AiAvatar />
      </div>
    ))}
  </div>
);
```

### - [ ] Step 4: Verify typecheck

Run: `npx tsc --noEmit`
Expected: no errors.

### - [ ] Step 5: Commit

```bash
git add src/components/AiAvatar
git commit -m "feat(components): add AiAvatar component"
```

---

## Task 2: AiCommentBubble — failing test

**Files:**
- Create: `src/components/AiCommentBubble/AiCommentBubble.test.tsx`

### - [ ] Step 1: Write failing test

Create `src/components/AiCommentBubble/AiCommentBubble.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AiCommentBubble } from "./AiCommentBubble";

describe("AiCommentBubble", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the full text as a ghost sizer immediately", () => {
    render(<AiCommentBubble text="Hello world" charDelayMs={10} />);
    const ghost = screen.getByTestId("ai-bubble-ghost");
    expect(ghost.textContent).toBe("Hello world");
  });

  it("starts with empty visible text and types it char by char", () => {
    render(<AiCommentBubble text="Hi" charDelayMs={10} />);
    const visible = screen.getByTestId("ai-bubble-visible");
    expect(visible.textContent).toBe("");

    act(() => { vi.advanceTimersByTime(10); });
    expect(visible.textContent).toBe("H");

    act(() => { vi.advanceTimersByTime(10); });
    expect(visible.textContent).toBe("Hi");
  });

  it("stops typing after final character", () => {
    render(<AiCommentBubble text="Hi" charDelayMs={10} />);
    act(() => { vi.advanceTimersByTime(100); });
    const visible = screen.getByTestId("ai-bubble-visible");
    expect(visible.textContent).toBe("Hi");
  });

  it("restarts animation when text prop changes", () => {
    const { rerender } = render(<AiCommentBubble text="abc" charDelayMs={10} />);
    act(() => { vi.advanceTimersByTime(100); });
    expect(screen.getByTestId("ai-bubble-visible").textContent).toBe("abc");

    rerender(<AiCommentBubble text="xyz" charDelayMs={10} />);
    expect(screen.getByTestId("ai-bubble-visible").textContent).toBe("");
    act(() => { vi.advanceTimersByTime(10); });
    expect(screen.getByTestId("ai-bubble-visible").textContent).toBe("x");
  });
});
```

### - [ ] Step 2: Run test, verify it fails

Run: `npx vitest run src/components/AiCommentBubble/AiCommentBubble.test.tsx`
Expected: FAIL — `Cannot find module './AiCommentBubble'`.

### - [ ] Step 3: Commit failing test

```bash
git add src/components/AiCommentBubble/AiCommentBubble.test.tsx
git commit -m "test(components): failing tests for AiCommentBubble"
```

---

## Task 3: AiCommentBubble — implementation

**Files:**
- Create: `src/components/AiCommentBubble/AiCommentBubble.tsx`
- Create: `src/components/AiCommentBubble/AiCommentBubble.module.css`

### - [ ] Step 1: Create CSS module

Create `src/components/AiCommentBubble/AiCommentBubble.module.css`:

```css
.container {
  display: flex;
  align-items: flex-start;
  gap: 0.6em;
  font-size: 1.5em;
  line-height: 1.4;
}

.avatarSlot {
  font-size: 1.6em;
  flex-shrink: 0;
}

.bubble {
  position: relative;
  display: grid;
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border, rgba(0, 0, 0, 0.12));
  border-radius: 20px;
  padding: 0.7em 1em 1.2em;
  box-shadow: 0 0.15em 0.6em rgba(0, 0, 0, 0.12);
  max-width: 42ch;
  min-width: 6em;
}

/* Tail pointing to the avatar on the left */
.bubble::before {
  content: "";
  position: absolute;
  top: 0.9em;
  left: -0.55em;
  width: 0;
  height: 0;
  border-top: 0.45em solid transparent;
  border-bottom: 0.45em solid transparent;
  border-right: 0.55em solid var(--color-surface);
  filter: drop-shadow(-1px 0 0 var(--color-border, rgba(0, 0, 0, 0.12)));
}

.bubble > .ghost,
.bubble > .visibleWrap {
  grid-area: 1 / 1;
}

.ghost {
  visibility: hidden;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.visibleWrap {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.caret {
  display: inline-block;
  width: 0.05em;
  margin-left: 0.05em;
  visibility: hidden;
}

.caret.active {
  visibility: visible;
  animation: caretBlink 500ms steps(2) infinite;
}

@keyframes caretBlink {
  from { opacity: 1; }
  to   { opacity: 0; }
}

.signature {
  position: absolute;
  bottom: 0.25em;
  right: 0.8em;
  font-size: 0.55em;
  color: var(--color-text-muted, rgba(0, 0, 0, 0.5));
  font-style: italic;
}
```

### - [ ] Step 2: Create component

Create `src/components/AiCommentBubble/AiCommentBubble.tsx`:

```tsx
import { useEffect, useRef } from "react";
import { AiAvatar } from "@/components/AiAvatar/AiAvatar";
import styles from "./AiCommentBubble.module.css";

export interface AiCommentBubbleProps {
  text: string;
  charDelayMs?: number;
}

export function AiCommentBubble({ text, charDelayMs = 15 }: AiCommentBubbleProps) {
  const visibleRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const visibleEl = visibleRef.current;
    const caretEl = caretRef.current;
    if (!visibleEl || !caretEl) return;

    visibleEl.textContent = "";
    caretEl.classList.add(styles.active!);

    let i = 0;
    const id = setInterval(() => {
      i++;
      visibleEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(id);
        caretEl.classList.remove(styles.active!);
      }
    }, charDelayMs);

    return () => clearInterval(id);
  }, [text, charDelayMs]);

  return (
    <div className={styles.container}>
      <div className={styles.avatarSlot}>
        <AiAvatar />
      </div>
      <div className={styles.bubble}>
        <span className={styles.ghost} data-testid="ai-bubble-ghost">{text}</span>
        <span className={styles.visibleWrap}>
          <span ref={visibleRef} data-testid="ai-bubble-visible" />
          <span ref={caretRef} className={styles.caret} aria-hidden="true">▌</span>
        </span>
        <span className={styles.signature}>— AI</span>
      </div>
    </div>
  );
}
```

### - [ ] Step 3: Run tests, verify they pass

Run: `npx vitest run src/components/AiCommentBubble/AiCommentBubble.test.tsx`
Expected: all 4 tests PASS.

### - [ ] Step 4: Typecheck

Run: `npx tsc --noEmit`
Expected: no errors.

### - [ ] Step 5: Commit

```bash
git add src/components/AiCommentBubble/AiCommentBubble.tsx src/components/AiCommentBubble/AiCommentBubble.module.css
git commit -m "feat(components): implement AiCommentBubble with typewriter animation"
```

---

## Task 4: AiCommentBubble story

**Files:**
- Create: `src/components/AiCommentBubble/AiCommentBubble.stories.tsx`

### - [ ] Step 1: Create stories

Create `src/components/AiCommentBubble/AiCommentBubble.stories.tsx`:

```tsx
import type { Story } from "@ladle/react";
import { useState } from "react";
import { AiCommentBubble } from "./AiCommentBubble";

const SHORT = "Красные вырвались вперёд — неужели подглядывали в Википедию?";
const LONG = "Синие сегодня блистают эрудицией, а красные явно надеются на удачу. Впрочем, пара правильных ответов всё же проскользнула — случайность или озарение? Посмотрим в следующем раунде.";
const ALT = "Никто не угадал столицу Перу. Даже я немного разочарован.";

export const Short: Story = () => (
  <div style={{ padding: 40, fontSize: 16 }}>
    <AiCommentBubble text={SHORT} />
  </div>
);

export const Long: Story = () => (
  <div style={{ padding: 40, fontSize: 16 }}>
    <AiCommentBubble text={LONG} />
  </div>
);

export const ChangeText: Story = () => {
  const [text, setText] = useState(SHORT);
  return (
    <div style={{ padding: 40, fontSize: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => setText((t) => (t === SHORT ? ALT : SHORT))}>
        Toggle text
      </button>
      <AiCommentBubble text={text} />
    </div>
  );
};
```

### - [ ] Step 2: Commit

```bash
git add src/components/AiCommentBubble/AiCommentBubble.stories.tsx
git commit -m "docs(components): Ladle stories for AiCommentBubble"
```

---

## Task 5: Wire into HostRound.Main

**Files:**
- Modify: `src/pages/round/HostRound.Main.tsx` (lines 105–110)

### - [ ] Step 1: Replace the stub

Open `src/pages/round/HostRound.Main.tsx`. Add import near the other `@/components/...` imports (after line 7):

```tsx
import { AiCommentBubble } from "@/components/AiCommentBubble/AiCommentBubble";
```

Then replace the current block at lines 105–110:

```tsx
  if (phase === "round-result" && review?.comment ) {
    return <div>
      TODO: AI COMMENT
      {review.comment}
    </div>
  }
```

with:

```tsx
  if (phase === "round-result" && review?.comment) {
    return <AiCommentBubble text={review.comment} />;
  }
```

### - [ ] Step 2: Typecheck

Run: `npx tsc --noEmit`
Expected: no errors.

### - [ ] Step 3: Run full test suite

Run: `npm run test -- --run`
Expected: all tests pass (including the 4 new `AiCommentBubble` tests).

### - [ ] Step 4: Manual smoke test (optional, dev)

Run: `npm run dev:storybook`
Open the `AiCommentBubble` stories in browser, verify:
- Text types out smoothly without bubble resizing mid-animation.
- Caret blinks during typing, disappears at end.
- Toggling text restarts the animation from empty.

### - [ ] Step 5: Commit

```bash
git add src/pages/round/HostRound.Main.tsx
git commit -m "feat(round): use AiCommentBubble for AI round comment"
```

---

## Done

All spec requirements are implemented:
- `AiAvatar` component without props, sized via parent `font-size` — Task 1.
- `AiCommentBubble` with ghost sizer + grid stack + imperative typewriter via ref — Tasks 2–3.
- Caret blink + auto-hide on completion — Task 3 CSS + component.
- Text-change restart (simple, no fade) — covered in Task 2 test + Task 3 effect cleanup.
- Wired into `HostRound.Main.tsx` — Task 5.
- Ladle stories + Vitest tests per project conventions — Tasks 1, 3, 4.
