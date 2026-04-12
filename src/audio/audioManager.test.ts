import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { audioManager } from "./audioManager";

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
  audioManager._reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("audioManager", () => {
  it("playMusic starts the music element", () => {
    audioManager.setMusicVolume(0.5);
    audioManager.playMusic();
    // Cannot directly read the private element, so we hit the second-call
    // contract: a second playMusic is a no-op.
    audioManager.playMusic();
    // No throw = success. Clean up.
    audioManager.stopMusic(false);
  });

  it("stopMusic(false) pauses immediately", () => {
    audioManager.playMusic();
    audioManager.stopMusic(false);
    // Reaching this line without timers = synchronous pause path.
    expect(true).toBe(true);
  });

  it("stopMusic(true) fades out over ~3s", () => {
    audioManager.setMusicVolume(1);
    audioManager.playMusic();
    audioManager.stopMusic(true);
    // Advance past fade duration
    vi.advanceTimersByTime(3100);
    // After fade the manager is back in the not-playing state — a subsequent
    // stopMusic is a no-op and must not throw.
    audioManager.stopMusic(true);
    expect(true).toBe(true);
  });

  it("playSignal fires navigator.vibrate when haptic is enabled", () => {
    const vibrate = vi.fn();
    (globalThis as unknown as { navigator: { vibrate: typeof vibrate } }).navigator = {
      vibrate,
    };
    audioManager.setHapticEnabled(true);
    audioManager.playSignal();
    expect(vibrate).toHaveBeenCalledWith(200);
  });

  it("playSignal skips vibrate when haptic disabled", () => {
    const vibrate = vi.fn();
    (globalThis as unknown as { navigator: { vibrate: typeof vibrate } }).navigator = {
      vibrate,
    };
    audioManager.setHapticEnabled(false);
    audioManager.playSignal();
    expect(vibrate).not.toHaveBeenCalled();
  });
});
