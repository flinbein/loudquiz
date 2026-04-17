/**
 * audioManager — imperative singleton controlling game music and signal.
 *
 * Separation from the calibration-popup test audio (`useTestAudio`) is
 * intentional: the two can play simultaneously without fighting each other
 * over the same HTMLAudioElement. The manager is UI-agnostic; React binding
 * lives in `useAudio`.
 *
 * Music is looped with a manual ~3s fade-out on stop. Signal is a one-shot
 * play; vibration is fired alongside when enabled.
 */

import MUSIC_SRC from "./music.mp3";
import SIGNAL_SRC from "./ring.mp3";

const FADE_OUT_DURATION_MS = 3000;
const FADE_STEP_MS = 50;

interface AudioManagerState {
  musicVolume: number;
  signalVolume: number;
  hapticEnabled: boolean;
}

class AudioManager {
  private musicEl: HTMLAudioElement | null = null;
  private signalEl: HTMLAudioElement | null = null;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  private state: AudioManagerState = {
    musicVolume: 0.7,
    signalVolume: 0.8,
    hapticEnabled: true,
  };
  private musicPlaying = false;

  private ensureMusic(): HTMLAudioElement | null {
    if (typeof Audio === "undefined") return null;
    if (!this.musicEl) {
      this.musicEl = new Audio(MUSIC_SRC);
      this.musicEl.loop = true;
    }
    return this.musicEl;
  }

  private ensureSignal(): HTMLAudioElement | null {
    if (typeof Audio === "undefined") return null;
    if (!this.signalEl) {
      this.signalEl = new Audio(SIGNAL_SRC);
      this.signalEl.loop = false;
    }
    return this.signalEl;
  }

  setMusicVolume(v: number): void {
    this.state.musicVolume = v;
    if (this.musicEl && this.musicPlaying && !this.fadeTimer) {
      this.musicEl.volume = v;
    }
  }

  setSignalVolume(v: number): void {
    this.state.signalVolume = v;
  }

  setHapticEnabled(enabled: boolean): void {
    this.state.hapticEnabled = enabled;
  }

  /**
   * Start looped music playback. If already playing, no-op. If a fade-out is
   * in progress, cancel it and jump back to full configured volume.
   */
  playMusic(): void {
    const el = this.ensureMusic();
    if (!el) return;
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    el.volume = this.state.musicVolume;
    if (!this.musicPlaying) {
      this.musicPlaying = true;
      void el.play().catch(() => {
        // Autoplay may be blocked; the UI gesture should unblock on next try.
      });
    }
  }

  /**
   * Stop music. If `fade` is true (default), fades out over ~3s then pauses.
   * Calling stopMusic while a fade is already in progress is a no-op.
   */
  stopMusic(fade = true): void {
    const el = this.musicEl;
    if (!el || !this.musicPlaying) return;
    if (this.fadeTimer) return;

    if (!fade) {
      el.pause();
      el.currentTime = 0;
      this.musicPlaying = false;
      return;
    }

    const startVolume = el.volume;
    const steps = Math.max(1, Math.floor(FADE_OUT_DURATION_MS / FADE_STEP_MS));
    let currentStep = 0;
    this.fadeTimer = setInterval(() => {
      currentStep += 1;
      const ratio = 1 - currentStep / steps;
      el.volume = Math.max(0, startVolume * ratio);
      if (currentStep >= steps) {
        if (this.fadeTimer) {
          clearInterval(this.fadeTimer);
          this.fadeTimer = null;
        }
        el.pause();
        el.currentTime = 0;
        el.volume = this.state.musicVolume;
        this.musicPlaying = false;
      }
    }, FADE_STEP_MS);
  }

  /** Fire the one-shot signal sound plus vibration (if enabled/supported). */
  playSignal(): void {
    const el = this.ensureSignal();
    if (el) {
      el.volume = this.state.signalVolume;
      el.currentTime = 0;
      void el.play().catch(() => {});
    }
    if (this.state.hapticEnabled && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(200);
    }
  }

  /** Test helper: fully reset internal state between unit tests. */
  _reset(): void {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
    if (this.musicEl) {
      this.musicEl.pause();
      this.musicEl = null;
    }
    this.signalEl = null;
    this.musicPlaying = false;
    this.state = { musicVolume: 0.7, signalVolume: 0.8, hapticEnabled: true };
  }
}

export const audioManager = new AudioManager();
export type { AudioManager };
