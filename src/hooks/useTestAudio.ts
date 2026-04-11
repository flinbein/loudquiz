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
  const appliedSrcRef = useRef<string | null>(null);

  if (audioRef.current === null) {
    audioRef.current = new Audio(src);
    appliedSrcRef.current = src;
  }
  const audio = audioRef.current;

  // Track the requested src via a ref — comparing against `audio.src` getter
  // is unreliable because HTMLMediaElement resolves it to an absolute URL,
  // which causes `audio.load()` to re-fire on every render and can freeze
  // the main thread when renders are frequent (e.g. driven by a rAF loop).
  if (appliedSrcRef.current !== src) {
    audio.src = src;
    audio.load();
    appliedSrcRef.current = src;
  }
  if (audio.loop !== loop) audio.loop = loop;
  if (audio.volume !== volume) audio.volume = volume;

  useEffect(() => {
    if (enabled) {
      void audio.play();
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [enabled, audio]);

  return { audio };
}
