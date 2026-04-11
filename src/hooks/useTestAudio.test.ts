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
    let capturedAudio: MockAudio | undefined;
    const { rerender } = renderHook(
      (props) => {
        const hookResult = useTestAudio(props);
        capturedAudio = hookResult.audio as unknown as MockAudio;
        return hookResult;
      },
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
    expect(capturedAudio!.pause).toHaveBeenCalled();
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
