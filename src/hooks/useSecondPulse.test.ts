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
