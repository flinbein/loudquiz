import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioManager } from "./AudioManager";

function makeMockAudio() {
  const mock = {
    play: vi.fn().mockImplementation(() => { mock.paused = false; return Promise.resolve(); }),
    pause: vi.fn().mockImplementation(() => { mock.paused = true; }),
    loop: false,
    volume: 1,
    currentTime: 0,
    paused: true,
    addEventListener: vi.fn(),
  };
  return mock;
}

describe("AudioManager", () => {
  let mockMusic: ReturnType<typeof makeMockAudio>;
  let mockRing: ReturnType<typeof makeMockAudio>;
  let audioManager: AudioManager;

  beforeEach(() => {
    mockMusic = makeMockAudio();
    mockRing = makeMockAudio();
    let callCount = 0;
    vi.spyOn(globalThis, "Audio").mockImplementation((_src?: string) => {
      return (callCount++ === 0 ? mockMusic : mockRing) as unknown as HTMLAudioElement;
    });
    audioManager = new AudioManager();
  });

  it("startMusic calls audio.play()", async () => {
    await audioManager.startMusic();
    expect(mockMusic.play).toHaveBeenCalledOnce();
  });

  it("startMusic sets loop=true", async () => {
    await audioManager.startMusic();
    expect(mockMusic.loop).toBe(true);
  });

  it("stopMusic immediately pauses audio", async () => {
    await audioManager.startMusic();
    audioManager.stopMusic(0);
    expect(mockMusic.pause).toHaveBeenCalledOnce();
  });

  it("playRing calls ring audio.play()", async () => {
    await audioManager.startMusic(); // triggers music Audio creation
    await audioManager.playRing();
    expect(mockRing.play).toHaveBeenCalledOnce();
  });

  it("isMusicPlaying returns false when not started", () => {
    expect(audioManager.isMusicPlaying()).toBe(false);
  });

  it("does not throw when audio.play() rejects", async () => {
    mockMusic.play.mockRejectedValue(new Error("not allowed"));
    await expect(audioManager.startMusic()).resolves.toBeUndefined();
  });

  it("playRing resets currentTime to 0", async () => {
    await audioManager.startMusic();
    mockRing.currentTime = 5;
    await audioManager.playRing();
    expect(mockRing.currentTime).toBe(0);
  });
});
