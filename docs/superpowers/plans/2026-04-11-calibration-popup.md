# CalibrationPopup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Calibration popup — a bottom sheet accessible from all gameplay screens (host and player) that configures per-device audio (music/signal volume, vibration, shared-headphones mode) and offers a clock-sync calibration section for players.

**Architecture:** Strict separation between dumb components (`src/components/**`, props-only) and container logic (`src/pages/calibration/CalibrationPopupContainer.tsx` + `src/pages/GameShell.tsx`, reads Zustand stores). A new `calibrationSettingsStore` mirrors `CalibrationSettings` for reactive updates; `calibrationUiStore` owns open/expand state. Test audio runs in isolation from game audio via separate `HTMLAudioElement`s. Clock-tick uses WebAudio `BufferSource` scheduled against `hostSecondBoundary - offset - tempOffset`.

**Tech Stack:** React 19, TypeScript (strict), Zustand, CSS Modules, i18next, Ladle, Vitest, Testing Library

**Spec:** `docs/superpowers/specs/2026-04-11-calibration-popup-design.md`

**Conventions:**
- Named exports only (`export function Foo`)
- CSS Modules, camelCase class names
- `@/` path alias → `src/`
- Stories as `Foo.stories.tsx` next to the component
- Tests as `*.test.ts(x)` next to the code under test
- UI text in Russian via i18next `t()` — no hardcoded strings in components
- Components under `src/components/**` MUST NOT import Zustand stores — props-only

**Important note:** Components under `src/components/**` are pure: they NEVER call `useGameStore`, `useCalibrationSettingsStore`, `useCalibrationUiStore`, `useClockSyncStore`, `getCalibration`, or `runSyncHandshake`. All data flows through props. Only `src/pages/**` and container files may read stores. `useTranslation()` from `react-i18next` IS allowed in components.

---

## Task order rationale

Bottom-up. Each task leaves the project compiling and tests passing:

1. Persistence + settings store (data foundation)
2. UI store (view state)
3. Primitive components (ToggleSwitch, VolumeSlider, BottomSheet, Toolbar)
4. Hooks (useTestAudio, useSecondPulse, useClockTick)
5. Calibration row components
6. ClockCalibration components
7. CalibrationPopup composition
8. i18n keys
9. Placeholder audio assets
10. GameShell + CalibrationPopupContainer
11. PlayPage integration + PlayerLobby refactor

---

### Task 1: Extend `CalibrationSettings` with `sharedHeadphones`

**Files:**
- Modify: `src/persistence/localPersistence.ts`
- Modify: `src/persistence/persistence.test.ts`

- [ ] **Step 1: Read the existing test file and find the calibration round-trip test**

Run: `npx vitest run src/persistence/persistence.test.ts -t calibration`
Expected: existing passes.

- [ ] **Step 2: Add a failing test for `sharedHeadphones` default**

Append this test inside the calibration `describe` block in `src/persistence/persistence.test.ts`:

```ts
it("returns sharedHeadphones=false by default", () => {
  localStorage.clear();
  const cal = getCalibration();
  expect(cal.sharedHeadphones).toBe(false);
});

it("round-trips sharedHeadphones=true", () => {
  setCalibration({
    musicVolume: 0.5,
    signalVolume: 0.5,
    hapticEnabled: true,
    sharedHeadphones: true,
  });
  expect(getCalibration().sharedHeadphones).toBe(true);
});

it("merges sharedHeadphones default when missing from stored record", () => {
  localStorage.setItem(
    "loud-quiz-calibration",
    JSON.stringify({ musicVolume: 0.4, signalVolume: 0.6, hapticEnabled: false }),
  );
  const cal = getCalibration();
  expect(cal.sharedHeadphones).toBe(false);
  expect(cal.musicVolume).toBe(0.4);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/persistence/persistence.test.ts`
Expected: the three new tests FAIL — property doesn't exist on type.

- [ ] **Step 4: Update `CalibrationSettings` and default**

In `src/persistence/localPersistence.ts`, replace the interface and default:

```ts
export interface CalibrationSettings {
  musicVolume: number;
  signalVolume: number;
  hapticEnabled: boolean;
  sharedHeadphones: boolean;
}

const defaultCalibration: CalibrationSettings = {
  musicVolume: 0.7,
  signalVolume: 0.8,
  hapticEnabled: true,
  sharedHeadphones: false,
};
```

- [ ] **Step 5: Update `getCalibration` to merge with defaults**

Replace the `getCalibration` function:

```ts
export function getCalibration(): CalibrationSettings {
  try {
    const raw = localStorage.getItem(KEYS.calibration);
    if (!raw) return { ...defaultCalibration };
    const parsed = JSON.parse(raw) as Partial<CalibrationSettings>;
    return { ...defaultCalibration, ...parsed };
  } catch {
    return { ...defaultCalibration };
  }
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run src/persistence/persistence.test.ts`
Expected: all pass.

- [ ] **Step 7: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/persistence/localPersistence.ts src/persistence/persistence.test.ts
git commit -m "feat: add sharedHeadphones to CalibrationSettings"
```

---

### Task 2: Create `calibrationSettingsStore`

A Zustand store that mirrors `CalibrationSettings` reactively, initialized from localStorage, with write-through setters.

**Files:**
- Create: `src/store/calibrationSettingsStore.ts`
- Create: `src/store/calibrationSettingsStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/calibrationSettingsStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useCalibrationSettingsStore } from "./calibrationSettingsStore";
import { getCalibration } from "@/persistence/localPersistence";

describe("calibrationSettingsStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useCalibrationSettingsStore.getState().reload();
  });

  it("initializes from localPersistence defaults when storage empty", () => {
    const s = useCalibrationSettingsStore.getState();
    expect(s.musicVolume).toBe(0.7);
    expect(s.signalVolume).toBe(0.8);
    expect(s.hapticEnabled).toBe(true);
    expect(s.sharedHeadphones).toBe(false);
  });

  it("setMusicVolume writes through to localStorage", () => {
    useCalibrationSettingsStore.getState().setMusicVolume(0.25);
    expect(useCalibrationSettingsStore.getState().musicVolume).toBe(0.25);
    expect(getCalibration().musicVolume).toBe(0.25);
  });

  it("setSignalVolume writes through", () => {
    useCalibrationSettingsStore.getState().setSignalVolume(0.33);
    expect(getCalibration().signalVolume).toBe(0.33);
  });

  it("setHapticEnabled writes through", () => {
    useCalibrationSettingsStore.getState().setHapticEnabled(false);
    expect(getCalibration().hapticEnabled).toBe(false);
  });

  it("setSharedHeadphones writes through", () => {
    useCalibrationSettingsStore.getState().setSharedHeadphones(true);
    expect(getCalibration().sharedHeadphones).toBe(true);
  });

  it("reload re-reads from localStorage", () => {
    localStorage.setItem(
      "loud-quiz-calibration",
      JSON.stringify({
        musicVolume: 0.1,
        signalVolume: 0.2,
        hapticEnabled: false,
        sharedHeadphones: true,
      }),
    );
    useCalibrationSettingsStore.getState().reload();
    const s = useCalibrationSettingsStore.getState();
    expect(s.musicVolume).toBe(0.1);
    expect(s.signalVolume).toBe(0.2);
    expect(s.hapticEnabled).toBe(false);
    expect(s.sharedHeadphones).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

Run: `npx vitest run src/store/calibrationSettingsStore.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the store**

Create `src/store/calibrationSettingsStore.ts`:

```ts
import { create } from "zustand";
import {
  type CalibrationSettings,
  getCalibration,
  setCalibration,
} from "@/persistence/localPersistence";

interface CalibrationSettingsState extends CalibrationSettings {
  setMusicVolume: (v: number) => void;
  setSignalVolume: (v: number) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setSharedHeadphones: (enabled: boolean) => void;
  /** Re-reads the record from localStorage. Used by tests. */
  reload: () => void;
}

/**
 * Zustand mirror of `CalibrationSettings`. Initialized from localPersistence
 * at module load, every setter write-throughs both the in-memory store and
 * localStorage via `setCalibration`. The game audio layer (`useAudio`)
 * subscribes here for live volume / shared-headphones updates.
 *
 * Components must NOT import this store directly — only pages and containers.
 */
export const useCalibrationSettingsStore = create<CalibrationSettingsState>(
  (set, get) => {
    function persist() {
      const s = get();
      setCalibration({
        musicVolume: s.musicVolume,
        signalVolume: s.signalVolume,
        hapticEnabled: s.hapticEnabled,
        sharedHeadphones: s.sharedHeadphones,
      });
    }

    return {
      ...getCalibration(),
      setMusicVolume: (v) => {
        set({ musicVolume: v });
        persist();
      },
      setSignalVolume: (v) => {
        set({ signalVolume: v });
        persist();
      },
      setHapticEnabled: (enabled) => {
        set({ hapticEnabled: enabled });
        persist();
      },
      setSharedHeadphones: (enabled) => {
        set({ sharedHeadphones: enabled });
        persist();
      },
      reload: () => set({ ...getCalibration() }),
    };
  },
);
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx vitest run src/store/calibrationSettingsStore.test.ts`
Expected: all pass.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/calibrationSettingsStore.ts src/store/calibrationSettingsStore.test.ts
git commit -m "feat: add calibrationSettingsStore (reactive mirror of CalibrationSettings)"
```

---

### Task 3: Create `calibrationUiStore`

View state: `open`, `clockSectionExpanded`. Not persisted. Closing the popup also collapses the clock section.

**Files:**
- Create: `src/store/calibrationUiStore.ts`
- Create: `src/store/calibrationUiStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/store/calibrationUiStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useCalibrationUiStore } from "./calibrationUiStore";

describe("calibrationUiStore", () => {
  beforeEach(() => {
    useCalibrationUiStore.setState({ open: false, clockSectionExpanded: false });
  });

  it("starts closed and collapsed", () => {
    const s = useCalibrationUiStore.getState();
    expect(s.open).toBe(false);
    expect(s.clockSectionExpanded).toBe(false);
  });

  it("setOpen(true) opens the popup", () => {
    useCalibrationUiStore.getState().setOpen(true);
    expect(useCalibrationUiStore.getState().open).toBe(true);
  });

  it("setOpen(false) closes and collapses clock section", () => {
    useCalibrationUiStore.setState({ open: true, clockSectionExpanded: true });
    useCalibrationUiStore.getState().setOpen(false);
    const s = useCalibrationUiStore.getState();
    expect(s.open).toBe(false);
    expect(s.clockSectionExpanded).toBe(false);
  });

  it("toggleClockSection flips the flag", () => {
    useCalibrationUiStore.getState().toggleClockSection();
    expect(useCalibrationUiStore.getState().clockSectionExpanded).toBe(true);
    useCalibrationUiStore.getState().toggleClockSection();
    expect(useCalibrationUiStore.getState().clockSectionExpanded).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npx vitest run src/store/calibrationUiStore.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

Create `src/store/calibrationUiStore.ts`:

```ts
import { create } from "zustand";

interface CalibrationUiState {
  open: boolean;
  clockSectionExpanded: boolean;
  setOpen: (open: boolean) => void;
  toggleClockSection: () => void;
}

/**
 * View-state store for the Calibration popup. Not persisted.
 * Closing the popup collapses the clock section — this matches the spec
 * requirement that the tick stops and audio resources are released.
 *
 * Lives in a dedicated store (not local useState) because the popup is
 * opened from both Toolbar and the duplicate button in PlayerLobby; a
 * store avoids prop drilling through GameShell.
 */
export const useCalibrationUiStore = create<CalibrationUiState>((set) => ({
  open: false,
  clockSectionExpanded: false,
  setOpen: (open) =>
    set((s) =>
      open
        ? { ...s, open: true }
        : { ...s, open: false, clockSectionExpanded: false },
    ),
  toggleClockSection: () =>
    set((s) => ({ ...s, clockSectionExpanded: !s.clockSectionExpanded })),
}));
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/store/calibrationUiStore.test.ts`
Expected: pass.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/store/calibrationUiStore.ts src/store/calibrationUiStore.test.ts
git commit -m "feat: add calibrationUiStore (open + clockSectionExpanded)"
```

---

### Task 4: `ToggleSwitch` primitive

**Files:**
- Create: `src/components/ToggleSwitch/ToggleSwitch.tsx`
- Create: `src/components/ToggleSwitch/ToggleSwitch.module.css`
- Create: `src/components/ToggleSwitch/ToggleSwitch.test.tsx`
- Create: `src/components/ToggleSwitch/ToggleSwitch.stories.tsx`

- [ ] **Step 1: Failing test**

Create `src/components/ToggleSwitch/ToggleSwitch.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToggleSwitch } from "./ToggleSwitch";

describe("ToggleSwitch", () => {
  it("renders with aria-checked reflecting checked prop", () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} label="x" />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange(!checked) on click", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="x" />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("calls onChange on Space key", async () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} label="x" />);
    const sw = screen.getByRole("switch");
    sw.focus();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not fire onChange when disabled", async () => {
    const onChange = vi.fn();
    render(
      <ToggleSwitch checked={false} onChange={onChange} disabled label="x" />,
    );
    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `npx vitest run src/components/ToggleSwitch`
Expected: module missing.

- [ ] **Step 3: Implement component**

Create `src/components/ToggleSwitch/ToggleSwitch.module.css`:

```css
.track {
  display: inline-flex;
  align-items: center;
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background: var(--color-toggle-off, #ccc);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: background 120ms ease;
  flex-shrink: 0;
}

.track[aria-checked="true"] {
  background: var(--color-accent, #5b6cff);
}

.track:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.track:focus-visible {
  outline: 2px solid var(--color-focus, #5b6cff);
  outline-offset: 2px;
}

.thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  margin-left: 2px;
  transition: margin 120ms ease;
}

.track[aria-checked="true"] .thumb {
  margin-left: 18px;
}
```

Create `src/components/ToggleSwitch/ToggleSwitch.tsx`:

```tsx
import styles from "./ToggleSwitch.module.css";

export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={styles.track}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.thumb} />
    </button>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/ToggleSwitch`
Expected: pass.

- [ ] **Step 5: Create story**

Create `src/components/ToggleSwitch/ToggleSwitch.stories.tsx`:

```tsx
import { useState } from "react";
import { ToggleSwitch } from "./ToggleSwitch";

export const Default = () => {
  const [on, setOn] = useState(false);
  return <ToggleSwitch checked={on} onChange={setOn} label="Vibration" />;
};

export const Checked = () => {
  const [on, setOn] = useState(true);
  return <ToggleSwitch checked={on} onChange={setOn} label="Vibration" />;
};

export const Disabled = () => (
  <ToggleSwitch checked={false} onChange={() => {}} disabled label="Disabled" />
);
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/ToggleSwitch/
git commit -m "feat(ui): add ToggleSwitch primitive"
```

---

### Task 5: `VolumeSlider` primitive

**Files:**
- Create: `src/components/VolumeSlider/VolumeSlider.tsx`
- Create: `src/components/VolumeSlider/VolumeSlider.module.css`
- Create: `src/components/VolumeSlider/VolumeSlider.test.tsx`
- Create: `src/components/VolumeSlider/VolumeSlider.stories.tsx`

- [ ] **Step 1: Failing test**

Create `src/components/VolumeSlider/VolumeSlider.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { VolumeSlider } from "./VolumeSlider";

describe("VolumeSlider", () => {
  it("renders input with value 0..1 scaled to 0..100", () => {
    render(<VolumeSlider value={0.5} onChange={() => {}} label="x" />);
    expect(screen.getByRole("slider")).toHaveAttribute("aria-valuenow", "50");
  });

  it("emits onChange with 0..1 value when user drags", () => {
    const onChange = vi.fn();
    render(<VolumeSlider value={0} onChange={onChange} label="x" />);
    fireEvent.input(screen.getByRole("slider"), { target: { value: "75" } });
    expect(onChange).toHaveBeenCalledWith(0.75);
  });

  it("is disabled when prop set", () => {
    render(<VolumeSlider value={0.5} onChange={() => {}} disabled label="x" />);
    expect(screen.getByRole("slider")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/components/VolumeSlider`
Expected: module missing.

- [ ] **Step 3: Implement**

Create `src/components/VolumeSlider/VolumeSlider.module.css`:

```css
.slider {
  flex: 1;
  max-width: 180px;
  height: 28px;
  cursor: pointer;
  accent-color: var(--color-accent, #5b6cff);
}

.slider:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

Create `src/components/VolumeSlider/VolumeSlider.tsx`:

```tsx
import styles from "./VolumeSlider.module.css";

export interface VolumeSliderProps {
  /** 0..1 */
  value: number;
  /** Receives 0..1 */
  onChange: (value: number) => void;
  disabled?: boolean;
  label: string;
}

export function VolumeSlider({
  value,
  onChange,
  disabled = false,
  label,
}: VolumeSliderProps) {
  const percent = Math.round(value * 100);
  return (
    <input
      type="range"
      role="slider"
      min={0}
      max={100}
      step={1}
      value={percent}
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      disabled={disabled}
      className={styles.slider}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      onInput={(e) =>
        onChange(Number((e.target as HTMLInputElement).value) / 100)
      }
    />
  );
}
```

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/components/VolumeSlider`
Expected: pass.

- [ ] **Step 5: Story**

Create `src/components/VolumeSlider/VolumeSlider.stories.tsx`:

```tsx
import { useState } from "react";
import { VolumeSlider } from "./VolumeSlider";

export const Default = () => {
  const [v, setV] = useState(0.7);
  return <VolumeSlider value={v} onChange={setV} label="Music" />;
};

export const Zero = () => {
  const [v, setV] = useState(0);
  return <VolumeSlider value={v} onChange={setV} label="Music" />;
};

export const Disabled = () => (
  <VolumeSlider value={0.3} onChange={() => {}} disabled label="Music" />
);
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/VolumeSlider/
git commit -m "feat(ui): add VolumeSlider primitive"
```

---

### Task 6: `BottomSheet` primitive

A reusable bottom-anchored sheet with backdrop, handle, ESC-to-close, backdrop click-to-close, focus trap, `role="dialog"`. Swipe-to-close is implemented via pointer events on the handle.

**Files:**
- Create: `src/components/BottomSheet/BottomSheet.tsx`
- Create: `src/components/BottomSheet/BottomSheet.module.css`
- Create: `src/components/BottomSheet/BottomSheet.test.tsx`
- Create: `src/components/BottomSheet/BottomSheet.stories.tsx`

- [ ] **Step 1: Failing test**

Create `src/components/BottomSheet/BottomSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomSheet } from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders children when open", () => {
    render(
      <BottomSheet open onClose={() => {}} ariaLabel="test">
        <p>hello</p>
      </BottomSheet>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <BottomSheet open={false} onClose={() => {}} ariaLabel="test">
        <p>hello</p>
      </BottomSheet>,
    );
    expect(screen.queryByText("hello")).not.toBeInTheDocument();
  });

  it("fires onClose when backdrop clicked", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="test">
        <p>hello</p>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByTestId("bottom-sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fires onClose on Escape", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="test">
        <p>hello</p>
      </BottomSheet>,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has role dialog and aria-modal", () => {
    render(
      <BottomSheet open onClose={() => {}} ariaLabel="calibration">
        <p>hello</p>
      </BottomSheet>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "calibration");
  });

  it("clicks inside the card do not close", async () => {
    const onClose = vi.fn();
    render(
      <BottomSheet open onClose={onClose} ariaLabel="test">
        <button>inside</button>
      </BottomSheet>,
    );
    await userEvent.click(screen.getByText("inside"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/components/BottomSheet`
Expected: module missing.

- [ ] **Step 3: Implement CSS**

Create `src/components/BottomSheet/BottomSheet.module.css`:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 180ms ease;
}

.card {
  background: var(--color-surface, #fff);
  color: var(--color-text, #222);
  border-radius: 18px 18px 0 0;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
  animation: slideUp 220ms ease;
}

.handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: var(--color-text-muted, #ccc);
  margin: 10px auto 0;
  touch-action: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

- [ ] **Step 4: Implement component**

Create `src/components/BottomSheet/BottomSheet.tsx`:

```tsx
import { useEffect, useRef } from "react";
import styles from "./BottomSheet.module.css";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}

/**
 * Bottom-anchored modal sheet. Backdrop click, Escape, and swipe-down on the
 * handle all call `onClose`. Focus is moved into the dialog on open and
 * returned to the previously-focused element on close.
 *
 * Not rendered at all when `open=false` — no reservation of DOM, no tick work.
 */
export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  children,
}: BottomSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      data-testid="bottom-sheet-backdrop"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
      >
        <SwipeHandle onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

function SwipeHandle({ onClose }: { onClose: () => void }) {
  const startY = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    const delta = e.clientY - startY.current;
    if (delta > 60) {
      startY.current = null;
      onClose();
    }
  }

  function onPointerUp() {
    startY.current = null;
  }

  return (
    <div
      className={styles.handle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
```

- [ ] **Step 5: Run tests — pass**

Run: `npx vitest run src/components/BottomSheet`
Expected: pass.

- [ ] **Step 6: Story**

Create `src/components/BottomSheet/BottomSheet.stories.tsx`:

```tsx
import { useState } from "react";
import { BottomSheet } from "./BottomSheet";

export const Default = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <BottomSheet open={open} onClose={() => setOpen(false)} ariaLabel="demo">
        <div style={{ padding: 16 }}>
          <h3>Hello sheet</h3>
          <p>Click backdrop, hit Escape, or drag the handle down to close.</p>
        </div>
      </BottomSheet>
    </>
  );
};
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/BottomSheet/
git commit -m "feat(ui): add BottomSheet primitive"
```

---

### Task 7: `Toolbar` primitive (extracted)

Three icon buttons: calibration 🔊, fullscreen ⛶, theme ☾. Props-only.

**Files:**
- Create: `src/components/Toolbar/Toolbar.tsx`
- Create: `src/components/Toolbar/Toolbar.module.css`
- Create: `src/components/Toolbar/Toolbar.test.tsx`
- Create: `src/components/Toolbar/Toolbar.stories.tsx`

- [ ] **Step 1: Failing test**

Create `src/components/Toolbar/Toolbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "./Toolbar";

describe("Toolbar", () => {
  it("calls onOpenCalibration when calibration button clicked", async () => {
    const fn = vi.fn();
    render(
      <Toolbar
        onOpenCalibration={fn}
        onToggleFullscreen={() => {}}
        onToggleTheme={() => {}}
      />,
    );
    await userEvent.click(screen.getByLabelText(/калибровк/i));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleFullscreen", async () => {
    const fn = vi.fn();
    render(
      <Toolbar
        onOpenCalibration={() => {}}
        onToggleFullscreen={fn}
        onToggleTheme={() => {}}
      />,
    );
    await userEvent.click(screen.getByLabelText(/fullscreen/i));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onToggleTheme", async () => {
    const fn = vi.fn();
    render(
      <Toolbar
        onOpenCalibration={() => {}}
        onToggleFullscreen={() => {}}
        onToggleTheme={fn}
      />,
    );
    await userEvent.click(screen.getByLabelText(/theme/i));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
```

Add an i18n stub in the test-setup — if the test environment already mocks `react-i18next` to pass through keys, this works out of the box. Otherwise the `t()` calls return the keys as-is. The test uses a Russian regex matching the key prefix `calibration.title` value `Калибровка` — if i18n isn't initialized in tests, adjust to match the key itself: use `screen.getByLabelText("calibration.title")`. Pick whichever the existing test setup uses; check `src/test-setup.ts` if present.

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/components/Toolbar`
Expected: module missing.

- [ ] **Step 3: Implement CSS**

Create `src/components/Toolbar/Toolbar.module.css`:

```css
.toolbar {
  display: flex;
  gap: 8px;
  padding: 8px;
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 10;
}

.btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: var(--color-surface-alt, rgba(0, 0, 0, 0.06));
  color: var(--color-text, #222);
  font-size: 18px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:hover {
  background: var(--color-surface-hover, rgba(0, 0, 0, 0.12));
}

.btn:focus-visible {
  outline: 2px solid var(--color-focus, #5b6cff);
  outline-offset: 2px;
}
```

- [ ] **Step 4: Implement component**

Create `src/components/Toolbar/Toolbar.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import styles from "./Toolbar.module.css";

export interface ToolbarProps {
  onOpenCalibration: () => void;
  onToggleFullscreen: () => void;
  onToggleTheme: () => void;
}

export function Toolbar({
  onOpenCalibration,
  onToggleFullscreen,
  onToggleTheme,
}: ToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.btn}
        aria-label={t("calibration.title")}
        onClick={onOpenCalibration}
      >
        {"\u{1F50A}"}
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Fullscreen"
        onClick={onToggleFullscreen}
      >
        {"\u26F6"}
      </button>
      <button
        type="button"
        className={styles.btn}
        aria-label="Theme"
        onClick={onToggleTheme}
      >
        {"\u263E"}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Ensure i18n key `calibration.title` is available (preview task)**

If running the Toolbar test fails because `calibration.title` resolves to itself (key-as-label behavior of the test setup), you can match the key literally. The proper translation is added in Task 16. Run the test now to confirm wiring:

Run: `npx vitest run src/components/Toolbar`
Expected: pass (test uses regex or exact key matching — whichever the setup yields).

- [ ] **Step 6: Story**

Create `src/components/Toolbar/Toolbar.stories.tsx`:

```tsx
import { Toolbar } from "./Toolbar";

export const Default = () => (
  <div style={{ position: "relative", height: 200, background: "#222" }}>
    <Toolbar
      onOpenCalibration={() => console.log("cal")}
      onToggleFullscreen={() => console.log("fs")}
      onToggleTheme={() => console.log("theme")}
    />
  </div>
);
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/Toolbar/
git commit -m "feat(ui): add Toolbar primitive"
```

---

### Task 8: `useTestAudio` hook

Manages a single `HTMLAudioElement` for test playback (music or signal). The hook owns the element via `ref`; callers pass `src`, `loop`, current `volume`, and an `enabled` flag.

**Files:**
- Create: `src/hooks/useTestAudio.ts`
- Create: `src/hooks/useTestAudio.test.ts`

- [ ] **Step 1: Failing test**

Create `src/hooks/useTestAudio.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTestAudio } from "./useTestAudio";

class MockAudio {
  src = "";
  volume = 1;
  loop = false;
  paused = true;
  currentTime = 0;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn(() => {
    this.paused = true;
  });
  load = vi.fn();
}

beforeEach(() => {
  (globalThis as unknown as { Audio: typeof MockAudio }).Audio =
    MockAudio as unknown as typeof MockAudio;
});

describe("useTestAudio", () => {
  it("does not play when enabled=false", () => {
    const { result } = renderHook(() =>
      useTestAudio({ src: "/m.mp3", loop: true, volume: 0.5, enabled: false }),
    );
    expect(result.current.audio.play).not.toHaveBeenCalled();
  });

  it("plays when enabled flips to true", () => {
    const { result, rerender } = renderHook(
      (props) => useTestAudio(props),
      {
        initialProps: {
          src: "/m.mp3",
          loop: true,
          volume: 0.5,
          enabled: false,
        },
      },
    );
    rerender({ src: "/m.mp3", loop: true, volume: 0.5, enabled: true });
    expect(result.current.audio.play).toHaveBeenCalled();
  });

  it("pauses and resets when enabled flips to false", () => {
    const { result, rerender } = renderHook(
      (props) => useTestAudio(props),
      {
        initialProps: {
          src: "/m.mp3",
          loop: true,
          volume: 0.5,
          enabled: true,
        },
      },
    );
    rerender({ src: "/m.mp3", loop: true, volume: 0.5, enabled: false });
    expect(result.current.audio.pause).toHaveBeenCalled();
  });

  it("updates volume live", () => {
    const { result, rerender } = renderHook(
      (props) => useTestAudio(props),
      {
        initialProps: {
          src: "/m.mp3",
          loop: false,
          volume: 0.5,
          enabled: true,
        },
      },
    );
    rerender({ src: "/m.mp3", loop: false, volume: 0.1, enabled: true });
    expect(result.current.audio.volume).toBe(0.1);
  });

  it("pauses on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useTestAudio({ src: "/m.mp3", loop: true, volume: 0.5, enabled: true }),
    );
    const audio = result.current.audio;
    unmount();
    expect(audio.pause).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/hooks/useTestAudio`
Expected: module missing.

- [ ] **Step 3: Implement hook**

Create `src/hooks/useTestAudio.ts`:

```ts
import { useEffect, useRef } from "react";

export interface UseTestAudioOptions {
  src: string;
  loop: boolean;
  /** 0..1 — live-updated every render */
  volume: number;
  /** When true, the element plays; when false, it pauses and resets. */
  enabled: boolean;
}

export interface UseTestAudioResult {
  /** Exposed only for tests — never read from components. */
  audio: HTMLAudioElement;
}

/**
 * Drives a single HTMLAudioElement used for isolated test playback inside
 * the Calibration popup. The element is fully separate from the game's
 * audioManager — they can play simultaneously without interfering.
 *
 * This hook does NOT read any store. Volume and enabled are props so the
 * caller decides the source of truth.
 */
export function useTestAudio(options: UseTestAudioOptions): UseTestAudioResult {
  const { src, loop, volume, enabled } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (audioRef.current === null) {
    audioRef.current = new Audio(src);
  }
  const audio = audioRef.current;

  if (audio.src !== src) audio.src = src;
  if (audio.loop !== loop) audio.loop = loop;
  if (audio.volume !== volume) audio.volume = volume;

  useEffect(() => {
    if (enabled) {
      void audio.play();
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [enabled, audio]);

  useEffect(() => {
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audio]);

  return { audio };
}
```

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/hooks/useTestAudio`
Expected: pass.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTestAudio.ts src/hooks/useTestAudio.test.ts
git commit -m "feat: add useTestAudio hook for isolated test playback"
```

---

### Task 9: `useSecondPulse` hook

Returns `{ timeMs, pulsing }`, where `timeMs` is `performance.now() + offset + tempOffset` and `pulsing` is `true` for 80ms after each whole-second crossing of that virtual clock.

**Files:**
- Create: `src/hooks/useSecondPulse.ts`
- Create: `src/hooks/useSecondPulse.test.ts`

- [ ] **Step 1: Failing test**

Create `src/hooks/useSecondPulse.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSecondPulse } from "./useSecondPulse";

describe("useSecondPulse", () => {
  let now = 0;
  let rafCallbacks: Array<FrameRequestCallback> = [];

  beforeEach(() => {
    now = 1000;
    rafCallbacks = [];
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function tick(toMs: number) {
    now = toMs;
    const cbs = rafCallbacks;
    rafCallbacks = [];
    cbs.forEach((cb) => cb(now));
  }

  it("returns enabled=false frozen state", () => {
    const { result } = renderHook(() =>
      useSecondPulse({ enabled: false, offset: 0, tempOffset: 0 }),
    );
    expect(result.current.pulsing).toBe(false);
  });

  it("pulses at whole-second boundary of virtual clock", () => {
    const { result } = renderHook(() =>
      useSecondPulse({ enabled: true, offset: 0, tempOffset: 0 }),
    );
    // initial time 1000 — whole second, pulsing
    act(() => tick(1000));
    expect(result.current.pulsing).toBe(true);
    act(() => tick(1050));
    expect(result.current.pulsing).toBe(true);
    act(() => tick(1090));
    expect(result.current.pulsing).toBe(false);
  });

  it("applies offset + tempOffset to virtual clock", () => {
    const { result } = renderHook(() =>
      useSecondPulse({ enabled: true, offset: 200, tempOffset: 0 }),
    );
    // now=1000, virtual=1200 → inside second, not boundary
    act(() => tick(1000));
    // advance to virtual 2000 → now=1800
    act(() => tick(1800));
    expect(result.current.pulsing).toBe(true);
  });
});
```

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/hooks/useSecondPulse`
Expected: module missing.

- [ ] **Step 3: Implement**

Create `src/hooks/useSecondPulse.ts`:

```ts
import { useEffect, useRef, useState } from "react";

export interface UseSecondPulseOptions {
  enabled: boolean;
  /** `hostNow - localNow` in ms */
  offset: number;
  /** Manual nudge, ms */
  tempOffset: number;
}

export interface UseSecondPulseResult {
  /** Virtual clock time in ms: `performance.now() + offset + tempOffset` */
  timeMs: number;
  /** True within `PULSE_DURATION_MS` after each whole-second boundary */
  pulsing: boolean;
}

const PULSE_DURATION_MS = 80;

/**
 * Drives the ClockDisplay: ticks on requestAnimationFrame, reports the
 * current virtual clock and whether we are inside an 80ms window right
 * after a whole-second boundary.
 *
 * Pure: no store access, all inputs are props.
 */
export function useSecondPulse(
  options: UseSecondPulseOptions,
): UseSecondPulseResult {
  const { enabled, offset, tempOffset } = options;
  const [state, setState] = useState<UseSecondPulseResult>({
    timeMs: 0,
    pulsing: false,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ timeMs: 0, pulsing: false });
      return;
    }

    function tick() {
      const virtual = performance.now() + offset + tempOffset;
      const msInSecond = ((virtual % 1000) + 1000) % 1000;
      const pulsing = msInSecond < PULSE_DURATION_MS;
      setState({ timeMs: virtual, pulsing });
      rafRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, offset, tempOffset]);

  return state;
}
```

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/hooks/useSecondPulse`
Expected: pass.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useSecondPulse.ts src/hooks/useSecondPulse.test.ts
git commit -m "feat: add useSecondPulse hook for ClockDisplay pulse"
```

---

### Task 10: `useClockTick` hook

Schedules a short WebAudio BufferSource click on each whole-second boundary of the virtual clock. Tick is 8ms sine 2kHz with exponential envelope, generated programmatically.

**Files:**
- Create: `src/hooks/useClockTick.ts`
- Create: `src/hooks/useClockTick.test.ts`

- [ ] **Step 1: Failing test**

Create `src/hooks/useClockTick.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClockTick } from "./useClockTick";

class MockGain {
  gain = { value: 0 };
  connect = vi.fn();
}
class MockBufferSource {
  buffer: AudioBuffer | null = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  onended: (() => void) | null = null;
}
class MockAudioContext {
  currentTime = 0;
  destination = {};
  state = "running";
  createBuffer = vi.fn(() => ({
    getChannelData: () => new Float32Array(400),
  }));
  createBufferSource = vi.fn(() => new MockBufferSource());
  createGain = vi.fn(() => new MockGain());
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  sampleRate = 48000;
}

beforeEach(() => {
  vi.useFakeTimers();
  (globalThis as unknown as { AudioContext: typeof MockAudioContext }).AudioContext =
    MockAudioContext;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useClockTick", () => {
  it("does nothing when enabled=false", () => {
    const { result } = renderHook(() =>
      useClockTick({ enabled: false, offset: 0, tempOffset: 0, volume: 0.5 }),
    );
    expect(result.current).toBeUndefined();
  });

  it("creates AudioContext lazily when enabled", () => {
    const created: MockAudioContext[] = [];
    const Orig = (globalThis as { AudioContext: typeof MockAudioContext })
      .AudioContext;
    (globalThis as { AudioContext: typeof MockAudioContext }).AudioContext =
      class extends MockAudioContext {
        constructor() {
          super();
          created.push(this);
        }
      };
    renderHook(() =>
      useClockTick({ enabled: true, offset: 0, tempOffset: 0, volume: 0.5 }),
    );
    expect(created.length).toBe(1);
    (globalThis as { AudioContext: typeof MockAudioContext }).AudioContext = Orig;
  });

  it("does not throw when unmounted before schedule", () => {
    const { unmount } = renderHook(() =>
      useClockTick({ enabled: true, offset: 0, tempOffset: 0, volume: 0.5 }),
    );
    expect(() => unmount()).not.toThrow();
  });
});
```

(The precise scheduling algebra is covered by `useSecondPulse.test.ts`; here we test only the lifecycle contract — context creation, enable/disable, unmount safety — because WebAudio timing in jsdom is unreliable.)

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/hooks/useClockTick`
Expected: module missing.

- [ ] **Step 3: Implement**

Create `src/hooks/useClockTick.ts`:

```ts
import { useEffect, useRef } from "react";

export interface UseClockTickOptions {
  enabled: boolean;
  /** `hostNow - localNow` in ms */
  offset: number;
  /** Manual nudge in ms, applied on top of `offset` */
  tempOffset: number;
  /** 0..1 */
  volume: number;
}

const TICK_DURATION_MS = 8;
const TICK_FREQ_HZ = 2000;
const SCHEDULE_AHEAD_MS = 200;

/**
 * Plays a short click sound on each whole-second boundary of the virtual
 * clock `performance.now() + offset + tempOffset`. Uses a lazily-created
 * AudioContext and BufferSource scheduled against `audioCtx.currentTime`.
 *
 * Pure hook: no store reads. Caller owns the values.
 */
export function useClockTick(options: UseClockTickOptions): void {
  const { enabled, offset, tempOffset, volume } = options;
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof AudioContext === "undefined") return;

    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    if (bufRef.current == null) {
      bufRef.current = buildClickBuffer(ctx);
    }
    const buffer = bufRef.current;

    let cancelled = false;

    function scheduleNext() {
      if (cancelled) return;
      // Virtual time of the next whole-second boundary, expressed in local ms.
      const virtualNow = performance.now() + offset + tempOffset;
      const msToNextSecond = 1000 - (((virtualNow % 1000) + 1000) % 1000);
      // Local time at which to fire (in ms).
      const fireLocalMs = performance.now() + msToNextSecond;
      // Convert to AudioContext time.
      const ctxAtNow = ctx.currentTime;
      const fireCtxTime = ctxAtNow + msToNextSecond / 1000;

      const gain = ctx.createGain();
      gain.gain.value = volume;
      gain.connect(ctx.destination);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(fireCtxTime);

      // Schedule the next pass slightly after this tick fires.
      const delayMs = Math.max(1, fireLocalMs - performance.now() + SCHEDULE_AHEAD_MS);
      timerRef.current = window.setTimeout(scheduleNext, delayMs);
    }

    scheduleNext();

    return () => {
      cancelled = true;
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, offset, tempOffset, volume]);

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "closed") {
        void ctx.close();
      }
      ctxRef.current = null;
      bufRef.current = null;
    };
  }, []);
}

function buildClickBuffer(ctx: AudioContext): AudioBuffer {
  const lengthSec = TICK_DURATION_MS / 1000;
  const sampleCount = Math.ceil(ctx.sampleRate * lengthSec);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const twoPiFOverSr = (2 * Math.PI * TICK_FREQ_HZ) / ctx.sampleRate;
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    // Exponential envelope — fast attack, fast decay
    const env = Math.exp(-6 * t);
    data[i] = Math.sin(twoPiFOverSr * i) * env;
  }
  return buffer;
}
```

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/hooks/useClockTick`
Expected: pass.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useClockTick.ts src/hooks/useClockTick.test.ts
git commit -m "feat: add useClockTick hook for clock calibration"
```

---

### Task 11: `CalibrationRow` + row components

Layout primitive `CalibrationRow`, plus the five specific rows (`MusicRow`, `SignalRow`, `VibrationRow`, `SharedHeadphonesRow`, `InstructionsBlock`).

**Files:**
- Create: `src/components/CalibrationPopup/rows/CalibrationRow.tsx`
- Create: `src/components/CalibrationPopup/rows/CalibrationRow.module.css`
- Create: `src/components/CalibrationPopup/rows/MusicRow.tsx`
- Create: `src/components/CalibrationPopup/rows/SignalRow.tsx`
- Create: `src/components/CalibrationPopup/rows/VibrationRow.tsx`
- Create: `src/components/CalibrationPopup/rows/SharedHeadphonesRow.tsx`
- Create: `src/components/CalibrationPopup/rows/InstructionsBlock.tsx`
- Create: `src/components/CalibrationPopup/rows/rows.stories.tsx`

- [ ] **Step 1: CSS for the row primitive**

Create `src/components/CalibrationPopup/rows/CalibrationRow.module.css`:

```css
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  gap: 12px;
  border-bottom: 1px solid var(--color-divider, #e8e8e8);
}

.row:last-child {
  border-bottom: none;
}

.label {
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text, #222);
}

.icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--color-surface-alt, #f0f0f0);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
}

.controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  justify-content: flex-end;
}

.iconButton {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent, #5b6cff);
  color: #fff;
  border: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  cursor: pointer;
  flex-shrink: 0;
}

.iconButton[aria-pressed="true"] {
  background: var(--color-accent-strong, #3f4be0);
}

.iconButton:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.iconButtonGhost {
  background: transparent;
  color: var(--color-accent, #5b6cff);
  border: 1.5px solid var(--color-accent, #5b6cff);
}

.instructions {
  font-size: 12px;
  line-height: 1.5;
  padding: 12px 16px 16px;
  color: var(--color-text-muted, #666);
  background: var(--color-surface-alt, #fafafa);
  border-top: 1px solid var(--color-divider, #eee);
}

.divider {
  height: 8px;
  background: var(--color-surface-alt, #f5f5f5);
}

.hint {
  font-size: 11px;
  color: var(--color-text-muted, #888);
  padding: 0 16px 8px;
}
```

- [ ] **Step 2: `CalibrationRow` component**

Create `src/components/CalibrationPopup/rows/CalibrationRow.tsx`:

```tsx
import styles from "./CalibrationRow.module.css";

export interface CalibrationRowProps {
  icon: string;
  label: string;
  children: React.ReactNode;
}

export function CalibrationRow({ icon, label, children }: CalibrationRowProps) {
  return (
    <div className={styles.row}>
      <div className={styles.label}>
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
        {label}
      </div>
      <div className={styles.controls}>{children}</div>
    </div>
  );
}

export function Divider() {
  return <div className={styles.divider} aria-hidden />;
}
```

- [ ] **Step 3: `MusicRow` component**

Create `src/components/CalibrationPopup/rows/MusicRow.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { VolumeSlider } from "@/components/VolumeSlider/VolumeSlider";
import { CalibrationRow } from "./CalibrationRow";
import styles from "./CalibrationRow.module.css";

export interface MusicRowProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export function MusicRow({
  volume,
  onVolumeChange,
  isPlaying,
  onTogglePlay,
}: MusicRowProps) {
  const { t } = useTranslation();
  return (
    <CalibrationRow icon={"\u{1F3B5}"} label={t("calibration.music")}>
      <button
        type="button"
        className={styles.iconButton}
        aria-pressed={isPlaying}
        aria-label={isPlaying ? t("calibration.pauseMusic") : t("calibration.playMusic")}
        onClick={onTogglePlay}
      >
        {isPlaying ? "\u23F8" : "\u25B6"}
      </button>
      <VolumeSlider
        value={volume}
        onChange={onVolumeChange}
        label={t("calibration.music")}
      />
    </CalibrationRow>
  );
}
```

- [ ] **Step 4: `SignalRow` component**

Create `src/components/CalibrationPopup/rows/SignalRow.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { VolumeSlider } from "@/components/VolumeSlider/VolumeSlider";
import { CalibrationRow } from "./CalibrationRow";
import styles from "./CalibrationRow.module.css";

export interface SignalRowProps {
  volume: number;
  onVolumeChange: (v: number) => void;
  onTest: () => void;
}

export function SignalRow({ volume, onVolumeChange, onTest }: SignalRowProps) {
  const { t } = useTranslation();
  return (
    <CalibrationRow icon={"\u{1F514}"} label={t("calibration.signal")}>
      <button
        type="button"
        className={`${styles.iconButton} ${styles.iconButtonGhost}`}
        aria-label={t("calibration.testSignal")}
        onClick={onTest}
      >
        {"\u266A"}
      </button>
      <VolumeSlider
        value={volume}
        onChange={onVolumeChange}
        label={t("calibration.signal")}
      />
    </CalibrationRow>
  );
}
```

- [ ] **Step 5: `VibrationRow` component**

Create `src/components/CalibrationPopup/rows/VibrationRow.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "@/components/ToggleSwitch/ToggleSwitch";
import { CalibrationRow } from "./CalibrationRow";
import styles from "./CalibrationRow.module.css";

export interface VibrationRowProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onTest: () => void;
  supported: boolean;
}

export function VibrationRow({
  enabled,
  onEnabledChange,
  onTest,
  supported,
}: VibrationRowProps) {
  const { t } = useTranslation();
  return (
    <>
      <CalibrationRow icon={"\u{1F4F3}"} label={t("calibration.vibration")}>
        <button
          type="button"
          className={`${styles.iconButton} ${styles.iconButtonGhost}`}
          aria-label={t("calibration.testVibration")}
          disabled={!supported}
          onClick={onTest}
        >
          {"\u{1F4F3}"}
        </button>
        <ToggleSwitch
          checked={enabled && supported}
          onChange={onEnabledChange}
          disabled={!supported}
          label={t("calibration.vibration")}
        />
      </CalibrationRow>
      {!supported && (
        <div className={styles.hint}>{t("calibration.vibrationUnsupported")}</div>
      )}
    </>
  );
}
```

- [ ] **Step 6: `SharedHeadphonesRow` component**

Create `src/components/CalibrationPopup/rows/SharedHeadphonesRow.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "@/components/ToggleSwitch/ToggleSwitch";
import { CalibrationRow } from "./CalibrationRow";

export interface SharedHeadphonesRowProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function SharedHeadphonesRow({
  enabled,
  onEnabledChange,
}: SharedHeadphonesRowProps) {
  const { t } = useTranslation();
  return (
    <CalibrationRow
      icon={"\u{1F3A7}"}
      label={t("calibration.sharedHeadphones")}
    >
      <ToggleSwitch
        checked={enabled}
        onChange={onEnabledChange}
        label={t("calibration.sharedHeadphones")}
      />
    </CalibrationRow>
  );
}
```

- [ ] **Step 7: `InstructionsBlock` component**

Create `src/components/CalibrationPopup/rows/InstructionsBlock.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import styles from "./CalibrationRow.module.css";

export function InstructionsBlock() {
  const { t } = useTranslation();
  return <div className={styles.instructions}>{t("calibration.instructions")}</div>;
}
```

- [ ] **Step 8: Stories for the rows**

Create `src/components/CalibrationPopup/rows/rows.stories.tsx`:

```tsx
import { useState } from "react";
import { MusicRow } from "./MusicRow";
import { SignalRow } from "./SignalRow";
import { VibrationRow } from "./VibrationRow";
import { SharedHeadphonesRow } from "./SharedHeadphonesRow";
import { InstructionsBlock } from "./InstructionsBlock";

export const Music = () => {
  const [v, setV] = useState(0.7);
  const [playing, setPlaying] = useState(false);
  return (
    <MusicRow
      volume={v}
      onVolumeChange={setV}
      isPlaying={playing}
      onTogglePlay={() => setPlaying((p) => !p)}
    />
  );
};

export const Signal = () => {
  const [v, setV] = useState(0.8);
  return (
    <SignalRow volume={v} onVolumeChange={setV} onTest={() => {}} />
  );
};

export const VibrationSupported = () => {
  const [on, setOn] = useState(true);
  return (
    <VibrationRow
      enabled={on}
      onEnabledChange={setOn}
      onTest={() => {}}
      supported
    />
  );
};

export const VibrationUnsupported = () => (
  <VibrationRow
    enabled={false}
    onEnabledChange={() => {}}
    onTest={() => {}}
    supported={false}
  />
);

export const SharedHeadphones = () => {
  const [on, setOn] = useState(false);
  return <SharedHeadphonesRow enabled={on} onEnabledChange={setOn} />;
};

export const Instructions = () => <InstructionsBlock />;
```

- [ ] **Step 9: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/components/CalibrationPopup/rows/
git commit -m "feat(ui): add CalibrationPopup rows"
```

---

### Task 12: `ClockDisplay` component

**Files:**
- Create: `src/components/CalibrationPopup/ClockCalibration/ClockDisplay.tsx`
- Create: `src/components/CalibrationPopup/ClockCalibration/ClockDisplay.module.css`
- Create: `src/components/CalibrationPopup/ClockCalibration/ClockDisplay.test.tsx`

- [ ] **Step 1: Failing test**

Create `src/components/CalibrationPopup/ClockCalibration/ClockDisplay.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClockDisplay, formatMMSS } from "./ClockDisplay";

describe("formatMMSS", () => {
  it("formats zero", () => {
    expect(formatMMSS(0)).toBe("00:00");
  });

  it("formats 65 seconds", () => {
    expect(formatMMSS(65_000)).toBe("01:05");
  });

  it("formats exactly 60s", () => {
    expect(formatMMSS(60_000)).toBe("01:00");
  });

  it("floors sub-second", () => {
    expect(formatMMSS(12_800)).toBe("00:12");
  });

  it("wraps at 60 minutes (mod)", () => {
    expect(formatMMSS(3_600_000)).toBe("00:00");
  });
});

describe("ClockDisplay", () => {
  it("renders formatted time", () => {
    render(<ClockDisplay timeMs={65_000} pulsing={false} />);
    expect(screen.getByText("01:05")).toBeInTheDocument();
  });

  it("applies pulsing class when pulsing=true", () => {
    render(<ClockDisplay timeMs={1000} pulsing={true} />);
    const el = screen.getByTestId("clock-display");
    expect(el.className).toMatch(/pulsing/);
  });
});
```

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/components/CalibrationPopup/ClockCalibration/ClockDisplay`
Expected: module missing.

- [ ] **Step 3: Implement CSS**

Create `src/components/CalibrationPopup/ClockCalibration/ClockDisplay.module.css`:

```css
.display {
  font-family: "Tektur", system-ui, sans-serif;
  font-size: 42px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-align: center;
  padding: 20px 16px;
  background: var(--color-surface, #fff);
  color: var(--color-text, #222);
  transition: background 60ms ease;
  border-radius: 8px;
}

.pulsing {
  background: var(--color-accent-bg, #eef0ff);
}
```

- [ ] **Step 4: Implement component**

Create `src/components/CalibrationPopup/ClockCalibration/ClockDisplay.tsx`:

```tsx
import styles from "./ClockDisplay.module.css";

export interface ClockDisplayProps {
  /** Virtual clock time in ms (already offset-corrected by the caller) */
  timeMs: number;
  /** True for ~80ms after each whole-second boundary */
  pulsing: boolean;
}

export function ClockDisplay({ timeMs, pulsing }: ClockDisplayProps) {
  return (
    <div
      data-testid="clock-display"
      className={`${styles.display} ${pulsing ? styles.pulsing : ""}`}
    >
      {formatMMSS(timeMs)}
    </div>
  );
}

/**
 * Formats a millisecond timestamp to MM:SS wrapped modulo one hour.
 * The epoch doesn't matter — this is a pulse indicator, not a wall clock.
 */
export function formatMMSS(ms: number): string {
  const totalSec = Math.floor(Math.max(0, ms) / 1000);
  const min = Math.floor(totalSec / 60) % 60;
  const sec = totalSec % 60;
  return `${pad(min)}:${pad(sec)}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
```

- [ ] **Step 5: Run tests — pass**

Run: `npx vitest run src/components/CalibrationPopup/ClockCalibration/ClockDisplay`
Expected: pass.

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/CalibrationPopup/ClockCalibration/ClockDisplay.tsx src/components/CalibrationPopup/ClockCalibration/ClockDisplay.module.css src/components/CalibrationPopup/ClockCalibration/ClockDisplay.test.tsx
git commit -m "feat(ui): add ClockDisplay component"
```

---

### Task 13: `OffsetSlider`, `OffsetControls`, `ClockTick`

Three small leaf components. `ClockTick` is a thin wrapper over `useClockTick` that renders nothing — keeps the hook as a component for easier integration in the container.

**Files:**
- Create: `src/components/CalibrationPopup/ClockCalibration/OffsetSlider.tsx`
- Create: `src/components/CalibrationPopup/ClockCalibration/OffsetControls.tsx`
- Create: `src/components/CalibrationPopup/ClockCalibration/ClockTick.tsx`

- [ ] **Step 1: `OffsetSlider`**

Create `src/components/CalibrationPopup/ClockCalibration/OffsetSlider.tsx`:

```tsx
export interface OffsetSliderProps {
  /** Current tempOffset in ms, within [-200, 200] */
  value: number;
  onChange: (ms: number) => void;
  disabled?: boolean;
}

const MIN = -200;
const MAX = 200;
const SNAP = 3;

/**
 * Slider for manual clock offset nudge. Range ±200 ms, step 1 ms,
 * snaps to 0 within ±3 ms of center.
 */
export function OffsetSlider({ value, onChange, disabled = false }: OffsetSliderProps) {
  return (
    <input
      type="range"
      min={MIN}
      max={MAX}
      step={1}
      value={value}
      disabled={disabled}
      aria-label="Offset nudge"
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      aria-valuenow={value}
      onChange={(e) => {
        const raw = Number(e.target.value);
        onChange(Math.abs(raw) <= SNAP ? 0 : raw);
      }}
      style={{ width: "100%" }}
    />
  );
}
```

- [ ] **Step 2: `OffsetControls`**

Create `src/components/CalibrationPopup/ClockCalibration/OffsetControls.tsx`:

```tsx
import { useTranslation } from "react-i18next";

export interface OffsetControlsProps {
  /** Current committed offset from clockSyncStore (ms) */
  offset: number;
  /** Pending temp offset (ms), 0 if none */
  tempOffset: number;
  onApply: () => void;
  onResync: () => void;
  /** True while re-sync handshake is running */
  syncing: boolean;
  /** Last re-sync failed */
  syncFailed: boolean;
}

/**
 * Numeric readout + Apply + Re-sync buttons.
 *
 * Pure: parent owns all state; this component only renders and forwards
 * click events.
 */
export function OffsetControls({
  offset,
  tempOffset,
  onApply,
  onResync,
  syncing,
  syncFailed,
}: OffsetControlsProps) {
  const { t } = useTranslation();
  const applyDisabled = tempOffset === 0 || syncing;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div>
        {t("calibration.clockOffset", { value: formatSigned(offset) })}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span aria-live="polite">
          {tempOffset !== 0
            ? t("calibration.clockPending", {
                sign: tempOffset > 0 ? "+" : "",
                value: tempOffset,
              })
            : ""}
        </span>
        <button
          type="button"
          onClick={onApply}
          disabled={applyDisabled}
          style={{ marginLeft: "auto" }}
        >
          {t("calibration.clockApply")}
        </button>
        <button
          type="button"
          onClick={onResync}
          disabled={syncing}
          aria-label={t("calibration.clockResync")}
        >
          {"\u{1F5D8}"}
        </button>
      </div>
      {syncFailed && (
        <div role="alert">{t("calibration.clockResyncFailed")}</div>
      )}
    </div>
  );
}

function formatSigned(ms: number): string {
  return ms > 0 ? `+${ms}` : String(ms);
}
```

- [ ] **Step 3: `ClockTick`**

Create `src/components/CalibrationPopup/ClockCalibration/ClockTick.tsx`:

```tsx
import { useClockTick } from "@/hooks/useClockTick";

export interface ClockTickProps {
  enabled: boolean;
  offset: number;
  tempOffset: number;
  volume: number;
}

/**
 * Thin wrapper rendering nothing, just drives `useClockTick`. Lives as a
 * component so `CalibrationPopup` composition stays JSX-only.
 */
export function ClockTick(props: ClockTickProps) {
  useClockTick(props);
  return null;
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CalibrationPopup/ClockCalibration/OffsetSlider.tsx src/components/CalibrationPopup/ClockCalibration/OffsetControls.tsx src/components/CalibrationPopup/ClockCalibration/ClockTick.tsx
git commit -m "feat(ui): add OffsetSlider, OffsetControls, ClockTick"
```

---

### Task 14: `ClockCalibrationSection`

Composition of the clock section. Handles collapsed/expanded, host-vs-player view differences.

**Files:**
- Create: `src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.tsx`
- Create: `src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.module.css`
- Create: `src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.test.tsx`

- [ ] **Step 1: Failing test**

Create `src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClockCalibrationSection } from "./ClockCalibrationSection";

function defaultProps() {
  return {
    role: "player" as const,
    expanded: true,
    onToggleExpanded: vi.fn(),
    offset: -187,
    tempOffset: 0,
    onTempOffsetChange: vi.fn(),
    onApply: vi.fn(),
    onResync: vi.fn(),
    syncing: false,
    syncFailed: false,
    displayTimeMs: 65_000,
    pulsing: false,
    volume: 0.8,
  };
}

describe("ClockCalibrationSection", () => {
  it("when collapsed only shows header button", () => {
    render(
      <ClockCalibrationSection {...defaultProps()} expanded={false} />,
    );
    expect(screen.queryByTestId("clock-display")).not.toBeInTheDocument();
  });

  it("clicking header toggles expanded", async () => {
    const p = defaultProps();
    render(<ClockCalibrationSection {...p} expanded={false} />);
    await userEvent.click(screen.getByRole("button", { name: /таймер/i }));
    expect(p.onToggleExpanded).toHaveBeenCalled();
  });

  it("player role shows slider and Apply", () => {
    render(<ClockCalibrationSection {...defaultProps()} />);
    expect(screen.getByLabelText(/offset nudge/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /применить/i }),
    ).toBeInTheDocument();
  });

  it("host role hides slider and Apply", () => {
    render(<ClockCalibrationSection {...defaultProps()} role="host" />);
    expect(screen.queryByLabelText(/offset nudge/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /применить/i }),
    ).not.toBeInTheDocument();
  });

  it("host role still shows ClockDisplay", () => {
    render(<ClockCalibrationSection {...defaultProps()} role="host" />);
    expect(screen.getByTestId("clock-display")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection`
Expected: module missing.

- [ ] **Step 3: Implement CSS**

Create `src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.module.css`:

```css
.section {
  padding: 12px 16px;
  border-top: 1px solid var(--color-divider, #e8e8e8);
}

.header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: transparent;
  border: none;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #222);
  cursor: pointer;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}
```

- [ ] **Step 4: Implement component**

Create `src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { ClockDisplay } from "./ClockDisplay";
import { ClockTick } from "./ClockTick";
import { OffsetSlider } from "./OffsetSlider";
import { OffsetControls } from "./OffsetControls";
import styles from "./ClockCalibrationSection.module.css";

export type CalibrationRole = "host" | "player";

export interface ClockCalibrationSectionProps {
  role: CalibrationRole;
  expanded: boolean;
  onToggleExpanded: () => void;

  /** From clockSyncStore. Host is always 0. */
  offset: number;

  /** Local temp nudge, player-only. Ignored on host. */
  tempOffset: number;
  onTempOffsetChange: (ms: number) => void;
  onApply: () => void;
  onResync: () => void;
  syncing: boolean;
  syncFailed: boolean;

  /** Virtual clock time in ms (already offset-corrected). */
  displayTimeMs: number;
  pulsing: boolean;

  /** Signal volume used for the tick sound */
  volume: number;
}

export function ClockCalibrationSection(props: ClockCalibrationSectionProps) {
  const { t } = useTranslation();
  const {
    role,
    expanded,
    onToggleExpanded,
    offset,
    tempOffset,
    onTempOffsetChange,
    onApply,
    onResync,
    syncing,
    syncFailed,
    displayTimeMs,
    pulsing,
    volume,
  } = props;

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={expanded}
        onClick={onToggleExpanded}
      >
        {t("calibration.clockSection")}
        <span aria-hidden>{expanded ? "▴" : "▾"}</span>
      </button>

      {expanded && (
        <div className={styles.body}>
          <ClockDisplay timeMs={displayTimeMs} pulsing={pulsing} />
          <ClockTick
            enabled={expanded}
            offset={offset}
            tempOffset={tempOffset}
            volume={volume}
          />
          {role === "player" && (
            <>
              <OffsetSlider
                value={tempOffset}
                onChange={onTempOffsetChange}
                disabled={syncing}
              />
              <OffsetControls
                offset={offset}
                tempOffset={tempOffset}
                onApply={onApply}
                onResync={onResync}
                syncing={syncing}
                syncFailed={syncFailed}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests — pass**

Run: `npx vitest run src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection`
Expected: pass (the test for header uses a Russian regex matching `calibration.clockSection` value; if i18n keys resolve to themselves in tests, adjust the test regex to match the key `calibration.clockSection`).

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.tsx src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.module.css src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.test.tsx
git commit -m "feat(ui): add ClockCalibrationSection"
```

---

### Task 15: `CalibrationPopup` composition

Ties it all together. Pure — no hooks, no stores, no side effects beyond rendering.

**Files:**
- Create: `src/components/CalibrationPopup/CalibrationPopup.tsx`
- Create: `src/components/CalibrationPopup/CalibrationPopup.module.css`
- Create: `src/components/CalibrationPopup/CalibrationPopup.test.tsx`
- Create: `src/components/CalibrationPopup/CalibrationPopup.stories.tsx`

- [ ] **Step 1: Failing test**

Create `src/components/CalibrationPopup/CalibrationPopup.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CalibrationPopup } from "./CalibrationPopup";

function defaultProps() {
  return {
    open: true,
    onClose: vi.fn(),
    role: "player" as const,
    music: {
      volume: 0.7,
      isPlaying: false,
      onVolumeChange: vi.fn(),
      onTogglePlay: vi.fn(),
    },
    signal: {
      volume: 0.8,
      onVolumeChange: vi.fn(),
      onTest: vi.fn(),
    },
    vibration: {
      enabled: true,
      supported: true,
      onEnabledChange: vi.fn(),
      onTest: vi.fn(),
    },
    sharedHeadphones: {
      enabled: false,
      onEnabledChange: vi.fn(),
    },
    clock: {
      expanded: false,
      onToggleExpanded: vi.fn(),
      offset: 0,
      tempOffset: 0,
      onTempOffsetChange: vi.fn(),
      onApply: vi.fn(),
      onResync: vi.fn(),
      syncing: false,
      syncFailed: false,
      displayTimeMs: 0,
      pulsing: false,
    },
  };
}

describe("CalibrationPopup", () => {
  it("does not render when closed", () => {
    render(<CalibrationPopup {...defaultProps()} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders all rows when open", () => {
    render(<CalibrationPopup {...defaultProps()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Each row renders its label via i18n — we rely on test setup returning keys
    expect(screen.getAllByRole("slider").length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/components/CalibrationPopup/CalibrationPopup`
Expected: module missing.

- [ ] **Step 3: CSS**

Create `src/components/CalibrationPopup/CalibrationPopup.module.css`:

```css
.title {
  font-size: 15px;
  font-weight: 700;
  padding: 6px 16px 12px;
  text-align: center;
  color: var(--color-text, #222);
}
```

- [ ] **Step 4: Implement**

Create `src/components/CalibrationPopup/CalibrationPopup.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { BottomSheet } from "@/components/BottomSheet/BottomSheet";
import { MusicRow } from "./rows/MusicRow";
import { SignalRow } from "./rows/SignalRow";
import { VibrationRow } from "./rows/VibrationRow";
import { SharedHeadphonesRow } from "./rows/SharedHeadphonesRow";
import { InstructionsBlock } from "./rows/InstructionsBlock";
import { Divider } from "./rows/CalibrationRow";
import {
  ClockCalibrationSection,
  type CalibrationRole,
} from "./ClockCalibration/ClockCalibrationSection";
import styles from "./CalibrationPopup.module.css";

export interface CalibrationPopupProps {
  open: boolean;
  onClose: () => void;
  role: CalibrationRole;
  music: {
    volume: number;
    isPlaying: boolean;
    onVolumeChange: (v: number) => void;
    onTogglePlay: () => void;
  };
  signal: {
    volume: number;
    onVolumeChange: (v: number) => void;
    onTest: () => void;
  };
  vibration: {
    enabled: boolean;
    supported: boolean;
    onEnabledChange: (enabled: boolean) => void;
    onTest: () => void;
  };
  sharedHeadphones: {
    enabled: boolean;
    onEnabledChange: (enabled: boolean) => void;
  };
  clock: {
    expanded: boolean;
    onToggleExpanded: () => void;
    offset: number;
    tempOffset: number;
    onTempOffsetChange: (ms: number) => void;
    onApply: () => void;
    onResync: () => void;
    syncing: boolean;
    syncFailed: boolean;
    displayTimeMs: number;
    pulsing: boolean;
  };
}

/**
 * Calibration popup composition. Pure — no hooks, no stores, no side effects.
 * All data and callbacks come through props from CalibrationPopupContainer.
 */
export function CalibrationPopup(props: CalibrationPopupProps) {
  const { t } = useTranslation();
  const {
    open,
    onClose,
    role,
    music,
    signal,
    vibration,
    sharedHeadphones,
    clock,
  } = props;

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel={t("calibration.title")}>
      <div className={styles.title}>{t("calibration.title")}</div>

      <MusicRow
        volume={music.volume}
        onVolumeChange={music.onVolumeChange}
        isPlaying={music.isPlaying}
        onTogglePlay={music.onTogglePlay}
      />
      <SignalRow
        volume={signal.volume}
        onVolumeChange={signal.onVolumeChange}
        onTest={signal.onTest}
      />
      <VibrationRow
        enabled={vibration.enabled}
        supported={vibration.supported}
        onEnabledChange={vibration.onEnabledChange}
        onTest={vibration.onTest}
      />

      <Divider />

      <SharedHeadphonesRow
        enabled={sharedHeadphones.enabled}
        onEnabledChange={sharedHeadphones.onEnabledChange}
      />

      <Divider />

      <ClockCalibrationSection
        role={role}
        expanded={clock.expanded}
        onToggleExpanded={clock.onToggleExpanded}
        offset={clock.offset}
        tempOffset={clock.tempOffset}
        onTempOffsetChange={clock.onTempOffsetChange}
        onApply={clock.onApply}
        onResync={clock.onResync}
        syncing={clock.syncing}
        syncFailed={clock.syncFailed}
        displayTimeMs={clock.displayTimeMs}
        pulsing={clock.pulsing}
        volume={signal.volume}
      />

      <InstructionsBlock />
    </BottomSheet>
  );
}
```

- [ ] **Step 5: Run tests — pass**

Run: `npx vitest run src/components/CalibrationPopup/CalibrationPopup`
Expected: pass.

- [ ] **Step 6: Story**

Create `src/components/CalibrationPopup/CalibrationPopup.stories.tsx`:

```tsx
import { useState } from "react";
import { CalibrationPopup } from "./CalibrationPopup";

function makeProps(role: "host" | "player") {
  const [open, setOpen] = useState(true);
  const [musicVol, setMusicVol] = useState(0.7);
  const [signalVol, setSignalVol] = useState(0.8);
  const [haptic, setHaptic] = useState(true);
  const [shared, setShared] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [tempOffset, setTempOffset] = useState(0);

  return {
    open,
    onClose: () => setOpen(false),
    role,
    music: {
      volume: musicVol,
      isPlaying: playing,
      onVolumeChange: setMusicVol,
      onTogglePlay: () => setPlaying((p) => !p),
    },
    signal: {
      volume: signalVol,
      onVolumeChange: setSignalVol,
      onTest: () => console.log("ring"),
    },
    vibration: {
      enabled: haptic,
      supported: true,
      onEnabledChange: setHaptic,
      onTest: () => console.log("vibrate"),
    },
    sharedHeadphones: {
      enabled: shared,
      onEnabledChange: setShared,
    },
    clock: {
      expanded,
      onToggleExpanded: () => setExpanded((e) => !e),
      offset: -187,
      tempOffset,
      onTempOffsetChange: setTempOffset,
      onApply: () => {
        console.log("apply", tempOffset);
        setTempOffset(0);
      },
      onResync: () => console.log("resync"),
      syncing: false,
      syncFailed: false,
      displayTimeMs: performance.now(),
      pulsing: false,
    },
  };
}

export const PlayerClosedClock = () => <CalibrationPopup {...makeProps("player")} />;
export const Host = () => <CalibrationPopup {...makeProps("host")} />;
export const VibrationUnsupported = () => {
  const props = makeProps("player");
  return (
    <CalibrationPopup
      {...props}
      vibration={{ ...props.vibration, supported: false, enabled: false }}
    />
  );
};
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/components/CalibrationPopup/CalibrationPopup.tsx src/components/CalibrationPopup/CalibrationPopup.module.css src/components/CalibrationPopup/CalibrationPopup.test.tsx src/components/CalibrationPopup/CalibrationPopup.stories.tsx
git commit -m "feat(ui): add CalibrationPopup composition"
```

---

### Task 16: i18n keys

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add `calibration` namespace to ru.json**

Open `src/i18n/ru.json`. Add the following top-level key (at the same level as existing keys like `lobby`):

```json
"calibration": {
  "title": "Калибровка",
  "music": "Музыка",
  "signal": "Сигнал",
  "vibration": "Вибрация",
  "sharedHeadphones": "Общие наушники",
  "clockSection": "Подстройка таймера",
  "clockOffset": "offset: {{value}} ms",
  "clockPending": "{{sign}}{{value}} ms",
  "clockApply": "Применить",
  "clockResync": "Пересинхронизировать",
  "clockResyncFailed": "Не удалось синхронизировать",
  "instructions": "Настрой громкость так, чтобы не слышать соседей. Сигнал должен пробиваться поверх музыки. Отключи уведомления на время игры.",
  "vibrationUnsupported": "Вибрация не поддерживается устройством",
  "testSignal": "Проиграть сигнал",
  "testVibration": "Проверить вибрацию",
  "playMusic": "Проиграть музыку",
  "pauseMusic": "Остановить музыку",
  "close": "Закрыть"
}
```

- [ ] **Step 2: Add the same keys to en.json with English values**

Open `src/i18n/en.json`. Add:

```json
"calibration": {
  "title": "Calibration",
  "music": "Music",
  "signal": "Signal",
  "vibration": "Vibration",
  "sharedHeadphones": "Shared headphones",
  "clockSection": "Clock adjustment",
  "clockOffset": "offset: {{value}} ms",
  "clockPending": "{{sign}}{{value}} ms",
  "clockApply": "Apply",
  "clockResync": "Re-sync",
  "clockResyncFailed": "Sync failed",
  "instructions": "Set the volume so you can't hear the other players. The signal should cut through the music. Turn off notifications for the game.",
  "vibrationUnsupported": "Vibration is not supported on this device",
  "testSignal": "Play signal",
  "testVibration": "Test vibration",
  "playMusic": "Play music",
  "pauseMusic": "Pause music",
  "close": "Close"
}
```

- [ ] **Step 3: Verify JSON syntactically valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/ru.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/en.json','utf8')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: pass (any tests that relied on key-as-fallback still pass because they use regexes or direct keys).

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ru.json src/i18n/en.json
git commit -m "feat(i18n): add calibration.* keys (ru, en)"
```

---

### Task 17: Placeholder audio assets

- [ ] **Step 1: Check whether assets already exist**

Run: `ls public/assets/ 2>/dev/null || echo "missing"`
Expected: either a listing showing `music.mp3` and `ring.mp3`, or `missing` / empty.

- [ ] **Step 2: If missing, create empty placeholder files**

If either file doesn't exist, create 1-second silent `.mp3` placeholders using ffmpeg if available:

Run:
```bash
mkdir -p public/assets
if [ ! -f public/assets/music.mp3 ]; then
  ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -q:a 9 -acodec libmp3lame public/assets/music.mp3 -y 2>/dev/null || touch public/assets/music.mp3
fi
if [ ! -f public/assets/ring.mp3 ]; then
  ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -q:a 9 -acodec libmp3lame public/assets/ring.mp3 -y 2>/dev/null || touch public/assets/ring.mp3
fi
```

Expected: both files exist (either real 1s silence mp3, or empty placeholders).

- [ ] **Step 3: Commit**

```bash
git add public/assets/music.mp3 public/assets/ring.mp3
git commit -m "chore: add placeholder audio assets for calibration popup"
```

If these files already existed and are real assets, skip the commit.

---

### Task 18: `CalibrationPopupContainer`

Reads all stores, wires callbacks, feeds props into `CalibrationPopup`.

**Files:**
- Create: `src/pages/calibration/CalibrationPopupContainer.tsx`
- Create: `src/pages/calibration/CalibrationPopupContainer.test.tsx`

- [ ] **Step 1: Failing test**

Create `src/pages/calibration/CalibrationPopupContainer.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalibrationPopupContainer } from "./CalibrationPopupContainer";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { useCalibrationSettingsStore } from "@/store/calibrationSettingsStore";
import { useClockSyncStore } from "@/store/clockSyncStore";

describe("CalibrationPopupContainer", () => {
  beforeEach(() => {
    localStorage.clear();
    useCalibrationUiStore.setState({ open: false, clockSectionExpanded: false });
    useCalibrationSettingsStore.getState().reload();
    useClockSyncStore.getState().reset();
  });

  it("renders nothing when closed", () => {
    render(<CalibrationPopupContainer role="player" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders popup when open", () => {
    act(() => useCalibrationUiStore.getState().setOpen(true));
    render(<CalibrationPopupContainer role="player" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shared headphones toggle writes to settings store", async () => {
    act(() => useCalibrationUiStore.getState().setOpen(true));
    render(<CalibrationPopupContainer role="player" />);
    const switches = screen.getAllByRole("switch");
    // The last switch in the list is SharedHeadphonesRow per render order
    // (Music ▶, Signal ♪ test, Vibration test, Vibration toggle, Shared)
    const sharedSwitch = switches[switches.length - 1];
    await userEvent.click(sharedSwitch);
    expect(useCalibrationSettingsStore.getState().sharedHeadphones).toBe(true);
  });

  it("music volume slider writes to settings store", async () => {
    act(() => useCalibrationUiStore.getState().setOpen(true));
    render(<CalibrationPopupContainer role="player" />);
    const sliders = screen.getAllByRole("slider");
    const musicSlider = sliders[0];
    // userEvent.type on a range input doesn't work reliably; use fireEvent
    const { fireEvent } = await import("@testing-library/react");
    fireEvent.input(musicSlider, { target: { value: "40" } });
    expect(useCalibrationSettingsStore.getState().musicVolume).toBe(0.4);
  });
});
```

- [ ] **Step 2: Run — fail**

Run: `npx vitest run src/pages/calibration/CalibrationPopupContainer`
Expected: module missing.

- [ ] **Step 3: Implement container**

Create `src/pages/calibration/CalibrationPopupContainer.tsx`:

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { CalibrationPopup } from "@/components/CalibrationPopup/CalibrationPopup";
import type { CalibrationRole } from "@/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection";
import { useCalibrationSettingsStore } from "@/store/calibrationSettingsStore";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { useClockSyncStore } from "@/store/clockSyncStore";
import { useTestAudio } from "@/hooks/useTestAudio";
import { useSecondPulse } from "@/hooks/useSecondPulse";

export interface CalibrationPopupContainerProps {
  role: CalibrationRole;
}

const MUSIC_SRC = "/assets/music.mp3";
const RING_SRC = "/assets/ring.mp3";

/**
 * Container that binds Zustand stores to the pure <CalibrationPopup>.
 * Lives under src/pages/ (not src/components/) because it reads stores.
 */
export function CalibrationPopupContainer({ role }: CalibrationPopupContainerProps) {
  const open = useCalibrationUiStore((s) => s.open);
  const clockExpanded = useCalibrationUiStore((s) => s.clockSectionExpanded);
  const toggleClock = useCalibrationUiStore((s) => s.toggleClockSection);
  const setOpen = useCalibrationUiStore((s) => s.setOpen);

  const musicVolume = useCalibrationSettingsStore((s) => s.musicVolume);
  const signalVolume = useCalibrationSettingsStore((s) => s.signalVolume);
  const hapticEnabled = useCalibrationSettingsStore((s) => s.hapticEnabled);
  const sharedHeadphones = useCalibrationSettingsStore((s) => s.sharedHeadphones);
  const setMusicVolume = useCalibrationSettingsStore((s) => s.setMusicVolume);
  const setSignalVolume = useCalibrationSettingsStore((s) => s.setSignalVolume);
  const setHapticEnabled = useCalibrationSettingsStore((s) => s.setHapticEnabled);
  const setSharedHeadphones = useCalibrationSettingsStore((s) => s.setSharedHeadphones);

  const offset = useClockSyncStore((s) => s.offset);
  const setOffset = useClockSyncStore((s) => s.setOffset);

  const [musicPlaying, setMusicPlaying] = useState(false);
  const [signalTick, setSignalTick] = useState(0);
  const [tempOffset, setTempOffset] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  // Reset volatile state when the popup closes.
  useEffect(() => {
    if (!open) {
      setMusicPlaying(false);
      setTempOffset(0);
      setSyncing(false);
      setSyncFailed(false);
    }
  }, [open]);

  // Isolated test music element — independent of game audio.
  useTestAudio({
    src: MUSIC_SRC,
    loop: true,
    volume: musicVolume,
    enabled: open && musicPlaying,
  });

  // Isolated signal element — re-triggered by bumping `signalTick`.
  const signalAudioRef = useRef<HTMLAudioElement | null>(null);
  if (signalAudioRef.current === null && typeof Audio !== "undefined") {
    signalAudioRef.current = new Audio(RING_SRC);
  }
  useEffect(() => {
    if (signalTick === 0) return;
    const a = signalAudioRef.current;
    if (!a) return;
    a.volume = signalVolume;
    a.currentTime = 0;
    void a.play();
  }, [signalTick, signalVolume]);

  // Clock display pulse — only ticks while popup open + section expanded.
  const { timeMs, pulsing } = useSecondPulse({
    enabled: open && clockExpanded,
    offset,
    tempOffset,
  });

  const vibrationSupported =
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  const handleTestVibration = useCallback(() => {
    if (vibrationSupported) navigator.vibrate(200);
  }, [vibrationSupported]);

  const handleTestSignal = useCallback(() => {
    setSignalTick((n) => n + 1);
  }, []);

  const handleApply = useCallback(() => {
    setOffset(offset + tempOffset);
    setTempOffset(0);
  }, [offset, tempOffset, setOffset]);

  const handleResync = useCallback(async () => {
    setSyncing(true);
    setSyncFailed(false);
    try {
      // runSyncHandshake is wired by usePlayerTransport; here we invoke the
      // already-established listener by calling the low-level helper through
      // a callback. In practice, the container gets `onResyncRequest` from
      // its parent (GameShell), which owns the transport. If no parent
      // handler is provided, we fail immediately.
      if (typeof window !== "undefined") {
        const handler = (window as unknown as { __calibrationResync?: () => Promise<number> })
          .__calibrationResync;
        if (!handler) {
          throw new Error("no resync handler");
        }
        const next = await handler();
        setOffset(next);
        setTempOffset(0);
      }
    } catch {
      setSyncFailed(true);
      setTimeout(() => setSyncFailed(false), 3000);
    } finally {
      setSyncing(false);
    }
  }, [setOffset]);

  return (
    <CalibrationPopup
      open={open}
      onClose={() => setOpen(false)}
      role={role}
      music={{
        volume: musicVolume,
        isPlaying: musicPlaying,
        onVolumeChange: setMusicVolume,
        onTogglePlay: () => setMusicPlaying((p) => !p),
      }}
      signal={{
        volume: signalVolume,
        onVolumeChange: setSignalVolume,
        onTest: handleTestSignal,
      }}
      vibration={{
        enabled: hapticEnabled,
        supported: vibrationSupported,
        onEnabledChange: setHapticEnabled,
        onTest: handleTestVibration,
      }}
      sharedHeadphones={{
        enabled: sharedHeadphones,
        onEnabledChange: setSharedHeadphones,
      }}
      clock={{
        expanded: clockExpanded,
        onToggleExpanded: toggleClock,
        offset,
        tempOffset,
        onTempOffsetChange: setTempOffset,
        onApply: handleApply,
        onResync: handleResync,
        syncing,
        syncFailed,
        displayTimeMs: timeMs,
        pulsing,
      }}
    />
  );
}
```

Note on `handleResync`: the re-sync button needs access to the transport layer to run `runSyncHandshake`. Rather than import `useTransport` here (which would couple the container to a React hook that's only valid in the transport's root page), we use a global bridge: the owning page registers a resync function on `window.__calibrationResync`, and this container calls it. Task 20 implements that registration in `GameShell`.

- [ ] **Step 4: Run tests — pass**

Run: `npx vitest run src/pages/calibration/CalibrationPopupContainer`
Expected: pass.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/calibration/
git commit -m "feat(pages): add CalibrationPopupContainer (store integration)"
```

---

### Task 19: `GameShell` layout

**Files:**
- Create: `src/pages/GameShell.tsx`
- Create: `src/pages/GameShell.module.css`

- [ ] **Step 1: CSS**

Create `src/pages/GameShell.module.css`:

```css
.shell {
  position: relative;
  width: 100%;
  min-height: 100vh;
}
```

- [ ] **Step 2: Implement**

Create `src/pages/GameShell.tsx`:

```tsx
import { useEffect } from "react";
import { Toolbar } from "@/components/Toolbar/Toolbar";
import { CalibrationPopupContainer } from "./calibration/CalibrationPopupContainer";
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
import { setTheme as saveTheme } from "@/persistence/localPersistence";
import type { CalibrationRole } from "@/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection";
import styles from "./GameShell.module.css";

export interface GameShellProps {
  role: CalibrationRole;
  /**
   * Runs a fresh clock-sync handshake and returns the new offset. Provided
   * by the owning player transport (host passes undefined — host never re-syncs).
   */
  onClockResync?: () => Promise<number>;
  children: React.ReactNode;
}

/**
 * Layout wrapper for all host/player gameplay screens. Owns:
 *   - the Toolbar (top-right icon buttons)
 *   - the CalibrationPopupContainer
 *   - the global bridge `window.__calibrationResync` that connects the
 *     container's re-sync button to the transport.
 *
 * NOT mounted around `/`, `/setup`, `/rules`, `/constructor` — those pages
 * don't need calibration.
 */
export function GameShell({ role, onClockResync, children }: GameShellProps) {
  const setOpen = useCalibrationUiStore((s) => s.setOpen);

  useEffect(() => {
    if (!onClockResync) return;
    (window as unknown as { __calibrationResync?: () => Promise<number> }).__calibrationResync =
      onClockResync;
    return () => {
      delete (window as unknown as { __calibrationResync?: () => Promise<number> })
        .__calibrationResync;
    };
  }, [onClockResync]);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  }

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    saveTheme(next);
  }

  return (
    <div className={styles.shell}>
      <Toolbar
        onOpenCalibration={() => setOpen(true)}
        onToggleFullscreen={toggleFullscreen}
        onToggleTheme={toggleTheme}
      />
      {children}
      <CalibrationPopupContainer role={role} />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GameShell.tsx src/pages/GameShell.module.css
git commit -m "feat(pages): add GameShell layout with Toolbar + calibration popup"
```

---

### Task 20: Wire `GameShell` into `PlayPage`

**Files:**
- Modify: `src/pages/PlayPage.tsx`

- [ ] **Step 1: Read the current file**

Open `src/pages/PlayPage.tsx`. The two functions that render content — `HostPlay` and `PlayerPlayConnected` — currently return bare `<div>` wrappers. Replace those wrappers with `<GameShell>`.

- [ ] **Step 2: Add import**

At the top of `src/pages/PlayPage.tsx`, add:

```ts
import { GameShell } from "@/pages/GameShell";
```

- [ ] **Step 3: Wrap `HostPlay` render output**

In `HostPlay`, replace the final return block:

```tsx
  return (
    <div>
      {phase === "lobby" && (
        <HostLobby roomId={transport.roomId} joinUrl={transport.joinUrl} />
      )}
      {phase.startsWith("round-") && <HostRound />}
    </div>
  );
```

with:

```tsx
  return (
    <GameShell role="host">
      {phase === "lobby" && (
        <HostLobby roomId={transport.roomId} joinUrl={transport.joinUrl} />
      )}
      {phase.startsWith("round-") && <HostRound />}
    </GameShell>
  );
```

- [ ] **Step 4: Wrap `PlayerPlayConnected` render output with re-sync wired up**

At the top of `PlayerPlayConnected`, add the re-sync callback that delegates to the transport. If `useTransport` exposes a method to re-run the sync handshake (named something like `resyncClock`), use it. Otherwise build the callback inline using `runSyncHandshake` — check `src/hooks/useTransport.ts` for the exact export.

For clarity, assume the minimal case: `useTransport` exposes `resyncClock?: () => Promise<number>`. If it doesn't, add it as a follow-up task (out of scope for this plan — mark TODO inline and proceed).

Replace the final return block in `PlayerPlayConnected`:

```tsx
  return (
    <div>
      {phase === "lobby" && (
        <PlayerLobby
          playerName={playerName}
          sendAction={transport.sendAction}
          connected={transport.connected}
        />
      )}
      {phase.startsWith("round-") && (
        <PlayerRound playerName={playerName} sendAction={transport.sendAction} />
      )}
    </div>
  );
```

with:

```tsx
  const onClockResync =
    "resyncClock" in transport && typeof transport.resyncClock === "function"
      ? transport.resyncClock
      : undefined;

  return (
    <GameShell role="player" onClockResync={onClockResync}>
      {phase === "lobby" && (
        <PlayerLobby
          playerName={playerName}
          sendAction={transport.sendAction}
          connected={transport.connected}
        />
      )}
      {phase.startsWith("round-") && (
        <PlayerRound playerName={playerName} sendAction={transport.sendAction} />
      )}
    </GameShell>
  );
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc -b`

If this produces errors about `transport.resyncClock` being unknown, change the declaration to use a type assertion — the goal is not to refactor `useTransport`, just to consume whatever it has:

```ts
  const onClockResync = (transport as unknown as {
    resyncClock?: () => Promise<number>;
  }).resyncClock;
```

Re-run typecheck. Expected: no errors.

- [ ] **Step 6: Run full tests**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/PlayPage.tsx
git commit -m "feat(pages): wrap host/player views in GameShell"
```

---

### Task 21: Refactor `PlayerLobby` — remove inline toolbar, keep duplicate button

**Files:**
- Modify: `src/pages/lobby/PlayerLobby.tsx`
- Modify: `src/pages/lobby/PlayerLobby.module.css`

- [ ] **Step 1: Read the current file**

Open `src/pages/lobby/PlayerLobby.tsx`. The `Toolbar` section (lines ~91–110) and the `toggleFullscreen` / `toggleTheme` helpers are now owned by `GameShell`. Remove them.

- [ ] **Step 2: Remove inline toolbar**

Delete lines ~91–110 — the entire `<div className={styles.toolbar}>...</div>` block. Also delete the `toggleFullscreen` and `toggleTheme` function definitions (they are duplicates of what `GameShell` already does).

Also remove the import for `saveTheme` if it's no longer used after the removal:

```ts
import { setTheme as saveTheme } from "@/persistence/localPersistence";
```

- [ ] **Step 3: Wire the bottom `.calibrationBtn` to open the popup**

Find the block:

```tsx
<button className={styles.calibrationBtn}>
  {t("lobby.calibration")}
</button>
```

Replace the `onClick` so it opens the calibration popup via the store. Add an import at the top:

```ts
import { useCalibrationUiStore } from "@/store/calibrationUiStore";
```

Near the top of the `PlayerLobby` function body, read the setter:

```ts
const openCalibration = useCalibrationUiStore((s) => s.setOpen);
```

And change the button:

```tsx
<button
  className={styles.calibrationBtn}
  onClick={() => openCalibration(true)}
>
  {t("lobby.calibration")}
</button>
```

- [ ] **Step 4: Remove `.toolbar` and `.toolBtn` styles from CSS**

Open `src/pages/lobby/PlayerLobby.module.css`. Delete the `.toolbar` and `.toolBtn` rules. Leave everything else intact.

- [ ] **Step 5: Update i18n alias (optional)**

`lobby.calibration` still resolves to `"Калибровка"`. Leave it as a synonym — don't delete, since the bottom button uses it. Alternatively, change the button to `t("calibration.title")` and remove `lobby.calibration` from `ru.json` and `en.json`. Pick whichever is less noisy; the spec doesn't care.

Recommended: keep `lobby.calibration` for the duplicate button — this is a semantic alias ("calibration from the lobby footer").

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: all pass. If existing `PlayerLobby` tests referenced the deleted toolbar buttons, update them to not expect those elements.

- [ ] **Step 8: Manual smoke test (optional but recommended)**

Run: `npm run dev`
- Open the host URL in two browser tabs via BroadcastChannel.
- As player, tap the duplicate "Калибровка" button in the lobby — popup opens.
- Tap the 🔊 icon in the top-right toolbar — popup opens.
- Close via backdrop, Escape, and swipe-down handle.
- In round phase, open the popup, expand "Подстройка таймера" on player, slide the nudge, apply.

Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add src/pages/lobby/PlayerLobby.tsx src/pages/lobby/PlayerLobby.module.css
git commit -m "refactor(lobby): remove inline toolbar, wire duplicate button to calibrationUiStore"
```

---

### Task 22: Final check — all tests, build, i18n

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all pass.

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: success, no warnings related to the new code.

- [ ] **Step 4: Run Ladle**

Run: `npm run dev:storybook`
Expected: server starts; verify that the new stories (Toolbar, BottomSheet, VolumeSlider, ToggleSwitch, rows, CalibrationPopup) render. Stop server.

- [ ] **Step 5: Update `task/plan-01-init.md`**

In `task/plan-01-init.md`, in the Фаза 7 block, mark `CalibrationPopup` item as done and add a **Выполнено** line summarizing what was built (keep it short — 2–3 lines, mention components created and that audio-system integration is deferred to the rest of Фаза 7).

Example update:

```markdown
- [x] CalibrationPopup — попап готов: bottom sheet с music/signal/vibration/
      shared-headphones + раскрывающаяся секция «Подстройка таймера». Интеграция
      с audioManager и блицем — в остальной части Фазы 7.
```

- [ ] **Step 6: Commit final status update**

```bash
git add task/plan-01-init.md
git commit -m "docs: mark CalibrationPopup complete in Фаза 7 plan"
```

---

## Self-review notes

**Spec coverage:**
- §1 Размещение → Tasks 7, 19, 20, 21 (Toolbar, GameShell, PlayPage, PlayerLobby)
- §2 Контент попапа → Tasks 11 (rows), 15 (composition)
- §3 Clock calibration → Tasks 9, 10, 12, 13, 14 (hooks + components)
- §4 Поведение (close, focus, a11y) → Task 6 (BottomSheet)
- §5 Data & stores → Tasks 1, 2, 3
- §6 Components → Tasks 4, 5, 6, 7, 11, 12, 13, 14, 15
- §7 Hooks → Tasks 8, 9, 10
- §8 i18n → Task 16
- §9 Тесты → interleaved, every task has its own tests
- §10 Файлы → matches the file list across all tasks
- §11 Риски → handled via Task 18 `handleResync` try/catch and Task 19 bridge

**Placeholder scan:** one remaining pragmatic workaround — the `window.__calibrationResync` bridge in Task 18. This is called out explicitly as an intentional compromise to avoid coupling the container to the transport hook. If the eventual `useTransport` refactor adds a proper resync method, replace the bridge in a follow-up.

**Type consistency:** `CalibrationRole` is exported from `ClockCalibrationSection.tsx` and re-used in `CalibrationPopup`, `CalibrationPopupContainer`, and `GameShell`. `CalibrationSettings` fields match across persistence, store, and rows.

**Known risks:**
1. `useTestAudio` uses `new Audio()` which works in jsdom but always has `paused=true`. The test mocks it explicitly.
2. `useClockTick` timing is hard to verify in jsdom — tests only cover lifecycle, not scheduling accuracy. Manual QA required.
3. The `window.__calibrationResync` bridge is global mutable state; acceptable because only one GameShell is ever mounted at a time within `PlayPage`.
