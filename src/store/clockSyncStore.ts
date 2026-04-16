import { create } from "zustand";

/**
 * Clock-sync store — player-local only.
 *
 * On the host this store stays at `offset: 0, synced: false` and is never touched;
 * `getHostNow()` is equivalent to `performance.now()`.
 *
 * On a player, `usePlayerTransport` runs a clock-sync handshake with the host
 * immediately after the WebRTC data channel opens and writes the measured offset
 * here before unblocking the UI (`connected` flips to true).
 *
 * `offset = hostNow - localNow` (both in ms).
 *
 * This store MUST NOT be part of the broadcast GameState — it is a purely local
 * translation table between the two machines' `performance.now()` clocks.
 */
interface ClockSyncState {
  offset: number;
  synced: boolean;
  setOffset: (offset: number) => void;
  reset: () => void;
}

export const useClockSyncStore = create<ClockSyncState>((set) => ({
  offset: 0,
  synced: false,
  setOffset: (offset) => set({ offset, synced: true }),
  reset: () => set({ offset: 0, synced: false }),
}));

/**
 * Returns the current host `performance.now()` value, translated into the
 * local machine's monotonic timeline via the offset measured during handshake.
 *
 * Cheap: plain store read, no React subscription. Safe to call inside
 * `useEffect` tick loops and `requestAnimationFrame` callbacks.
 */
export function getHostNow(): number {
  return performance.now() + useClockSyncStore.getState().offset;
}

/**
 * Inverse of `getHostNow()`: converts a timestamp captured on the host's
 * `performance.now()` clock into the **local** machine's `performance.now()`
 * timeline. Use this at component call sites when passing host-originated
 * `startedAt` values into timer components, so the components themselves can
 * stay pure and keep using local `performance.now()` internally.
 *
 * On the host, offset is 0 and this is an identity — safe to use there too.
 */
export function toLocalTime(hostTime: number = 0): number {
  return hostTime - useClockSyncStore.getState().offset;
}

