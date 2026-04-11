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
