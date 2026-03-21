/**
 * AudioManager — handles music, ring signals, and WakeLock.
 * Uses audio files: /music.mp3 (looped ambient), /ring.mp3 (round signal).
 */

const MUSIC_VOL_KEY = "audioVolume:music";
const RING_VOL_KEY = "audioVolume:ring";

function loadVolume(key: string, fallback: number): number {
  try {
    const v = parseFloat(localStorage.getItem(key) ?? "");
    return isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
  } catch {
    return fallback;
  }
}

export class AudioManager {
  private music: HTMLAudioElement | null = null;
  private ring: HTMLAudioElement | null = null;
  private wakeLockSentinel: WakeLockSentinel | null = null;
  private musicVolume: number = loadVolume(MUSIC_VOL_KEY, 0.5);
  private ringVolume: number = loadVolume(RING_VOL_KEY, 1.0);

  private getMusic(): HTMLAudioElement {
    if (!this.music) {
      this.music = new Audio("/music.mp3");
      this.music.loop = true;
      this.music.volume = this.musicVolume;
    }
    return this.music;
  }

  private getRing(): HTMLAudioElement {
    if (!this.ring) {
      this.ring = new Audio("/ring.mp3");
      this.ring.volume = this.ringVolume;
    }
    return this.ring;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  getRingVolume(): number {
    return this.ringVolume;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = Math.min(1, Math.max(0, v));
    if (this.music) this.music.volume = this.musicVolume;
    try { localStorage.setItem(MUSIC_VOL_KEY, String(this.musicVolume)); } catch { /* ignore */ }
  }

  setRingVolume(v: number): void {
    this.ringVolume = Math.min(1, Math.max(0, v));
    if (this.ring) this.ring.volume = this.ringVolume;
    try { localStorage.setItem(RING_VOL_KEY, String(this.ringVolume)); } catch { /* ignore */ }
  }

  // ── Ring ──────────────────────────────────────────────────────────────────

  async playRing(): Promise<void> {
    try {
      const ring = this.getRing();
      ring.currentTime = 0;
      await ring.play();
    } catch {
      // Audio not available or blocked
    }
  }

  // ── Music ─────────────────────────────────────────────────────────────────

  async startMusic(): Promise<void> {
    try {
      const music = this.getMusic();
      if (!music.paused) return;
      await music.play();
    } catch {
      // Audio not available or blocked
    }
  }

  stopMusic(fadeDurationSec = 0): void {
    const music = this.music;
    if (!music || music.paused) return;

    if (fadeDurationSec <= 0) {
      music.pause();
      music.currentTime = 0;
    } else {
      const startVol = music.volume;
      const steps = Math.ceil(fadeDurationSec * 20);
      const stepMs = (fadeDurationSec * 1000) / steps;
      let step = 0;
      const fade = setInterval(() => {
        step++;
        music.volume = Math.max(0, startVol * (1 - step / steps));
        if (step >= steps) {
          clearInterval(fade);
          music.pause();
          music.currentTime = 0;
          music.volume = this.musicVolume;
        }
      }, stepMs);
    }
  }

  isMusicPlaying(): boolean {
    return this.music !== null && !this.music.paused;
  }

  // ── WakeLock ──────────────────────────────────────────────────────────────

  async requestWakeLock(): Promise<void> {
    if (!navigator.wakeLock) return;
    try {
      this.wakeLockSentinel = await navigator.wakeLock.request("screen");
      this.wakeLockSentinel.addEventListener("release", () => {
        this.wakeLockSentinel = null;
      });
    } catch {
      // Not supported or document not visible
    }
  }

  async releaseWakeLock(): Promise<void> {
    if (this.wakeLockSentinel) {
      await this.wakeLockSentinel.release().catch(() => {});
      this.wakeLockSentinel = null;
    }
  }

  hasWakeLock(): boolean {
    return this.wakeLockSentinel !== null;
  }
}

export const audioManager = new AudioManager();
