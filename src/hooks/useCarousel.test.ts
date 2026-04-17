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
