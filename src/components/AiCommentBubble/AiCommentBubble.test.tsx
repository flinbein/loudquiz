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
