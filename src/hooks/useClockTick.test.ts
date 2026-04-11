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
    const g = globalThis as unknown as { AudioContext: typeof MockAudioContext };
    const Orig = g.AudioContext;
    g.AudioContext = class extends MockAudioContext {
      constructor() {
        super();
        created.push(this);
      }
    };
    renderHook(() =>
      useClockTick({ enabled: true, offset: 0, tempOffset: 0, volume: 0.5 }),
    );
    expect(created.length).toBe(1);
    g.AudioContext = Orig;
  });

  it("does not throw when unmounted before schedule", () => {
    const { unmount } = renderHook(() =>
      useClockTick({ enabled: true, offset: 0, tempOffset: 0, volume: 0.5 }),
    );
    expect(() => unmount()).not.toThrow();
  });
});
