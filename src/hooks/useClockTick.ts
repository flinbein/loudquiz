import { useEffect, useRef } from "react";

export interface UseClockTickOptions {
  enabled: boolean;
  /** `hostNow - localNow` in ms */
  offset: number;
  /** Manual nudge in ms, applied on top of `offset` */
  tempOffset: number;
  /** 0..1 */
  volume: number;
}

const TICK_DURATION_MS = 8;
const TICK_FREQ_HZ = 2000;
const SCHEDULE_AHEAD_MS = 200;

/**
 * Plays a short click sound on each whole-second boundary of the virtual
 * clock `performance.now() + offset + tempOffset`. Uses a lazily-created
 * AudioContext and BufferSource scheduled against `audioCtx.currentTime`.
 *
 * Pure hook: no store reads. Caller owns the values.
 */
export function useClockTick(options: UseClockTickOptions): void {
  const { enabled, offset, tempOffset, volume } = options;
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const timerRef = useRef<number | null>(null);

  // Keep live values in refs so the scheduling loop can read them without
  // being torn down every time the user drags a slider (tempOffset/volume
  // update continuously). The effect only re-runs when `enabled` flips.
  const offsetRef = useRef(offset);
  const tempOffsetRef = useRef(tempOffset);
  const volumeRef = useRef(volume);
  offsetRef.current = offset;
  tempOffsetRef.current = tempOffset;
  volumeRef.current = volume;

  useEffect(() => {
    if (!enabled) return;
    if (typeof AudioContext === "undefined") return;

    const ctx = ctxRef.current ?? new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    if (bufRef.current == null) {
      bufRef.current = buildClickBuffer(ctx);
    }
    const buffer = bufRef.current;

    let cancelled = false;

    function scheduleNext() {
      if (cancelled) return;
      // Virtual time of the next whole-second boundary, expressed in local ms.
      const virtualNow = performance.now() + offsetRef.current + tempOffsetRef.current;
      const msToNextSecond = 1000 - (((virtualNow % 1000) + 1000) % 1000);
      // Local time at which to fire (in ms).
      const fireLocalMs = performance.now() + msToNextSecond;
      // Convert to AudioContext time.
      const ctxAtNow = ctx.currentTime;
      const fireCtxTime = ctxAtNow + msToNextSecond / 1000;

      const gain = ctx.createGain();
      gain.gain.value = volumeRef.current;
      gain.connect(ctx.destination);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(fireCtxTime);

      // Schedule the next pass slightly after this tick fires.
      const delayMs = Math.max(1, fireLocalMs - performance.now() + SCHEDULE_AHEAD_MS);
      timerRef.current = window.setTimeout(scheduleNext, delayMs);
    }

    scheduleNext();

    return () => {
      cancelled = true;
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled]);

  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state !== "closed") {
        void ctx.close();
      }
      ctxRef.current = null;
      bufRef.current = null;
    };
  }, []);
}

function buildClickBuffer(ctx: AudioContext): AudioBuffer {
  const lengthSec = TICK_DURATION_MS / 1000;
  const sampleCount = Math.ceil(ctx.sampleRate * lengthSec);
  const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const twoPiFOverSr = (2 * Math.PI * TICK_FREQ_HZ) / ctx.sampleRate;
  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    // Exponential envelope — fast attack, fast decay
    const env = Math.exp(-6 * t);
    data[i] = Math.sin(twoPiFOverSr * i) * env;
  }
  return buffer;
}
