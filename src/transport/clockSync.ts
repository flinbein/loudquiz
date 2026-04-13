import type { Transport, SyncResponseMessage } from "@/transport/interface";

/**
 * Pure clock-sync helpers — factored out of useTransport.ts so they can be
 * unit-tested against a mock transport without a React tree.
 *
 * Algorithm: Cristian's algorithm with multi-sample min-RTT selection (the
 * same trick NTP uses). Take N samples, pick the one with the smallest
 * round-trip, and compute offset from that. The minimum-RTT sample has the
 * least room for asymmetric delay, so its offset estimate is the most
 * accurate — averaging or median across samples is strictly worse here.
 */

export interface SyncSample {
  /** Round-trip time, in ms — t1 - t0 on the player's clock. */
  rtt: number;
  /**
   * Offset in ms such that `hostNow ≈ localNow + offset`.
   * Formula: `hostNow + rtt/2 - t1` (assumes symmetric network delay).
   */
  offset: number;
}

/**
 * Picks the sample with the smallest RTT and returns its offset.
 * Throws if the list is empty — callers must ensure at least one sample
 * succeeded before invoking this.
 */
export function pickBestSample(samples: readonly SyncSample[]): number {
  if (samples.length === 0) {
    throw new Error("pickBestSample: no samples");
  }
  let best = samples[0];
  for (let i = 1; i < samples.length; i++) {
    if (samples[i]!.rtt < best!.rtt) best = samples[i];
  }
  return best!.offset;
}

export interface RunSyncHandshakeOptions {
  /** Number of samples to take. Defaults to 5. */
  sampleCount?: number;
  /** Gap between consecutive samples, in ms. Defaults to 100. */
  gapMs?: number;
  /** Per-sample timeout, in ms. Defaults to 2000. */
  timeoutMs?: number;
}

/**
 * Runs a multi-sample clock-sync handshake against the host.
 *
 * Caller must register an onMessage handler that forwards `sync-response`
 * messages into `deliverResponse` (see usePlayerTransport) — this function
 * doesn't attach its own listener to keep it decoupled from the transport's
 * single-handler API.
 *
 * Resolves to the measured offset (ms) in the same convention as
 * `SyncSample.offset`. Rejects if every sample times out.
 */
export async function runSyncHandshake(
  transport: Pick<Transport, "broadcast">,
  register: (nonce: number, resolve: (msg: SyncResponseMessage) => void) => void,
  unregister: (nonce: number) => void,
  options: RunSyncHandshakeOptions = {},
): Promise<number> {
  const sampleCount = options.sampleCount ?? 5;
  const gapMs = options.gapMs ?? 100;
  const timeoutMs = options.timeoutMs ?? 2000;

  const samples: SyncSample[] = [];
  let nonceCounter = Math.floor(Math.random() * 1_000_000);

  for (let i = 0; i < sampleCount; i++) {
    const nonce = ++nonceCounter;
    try {
      const sample = await takeSample(transport, nonce, register, unregister, timeoutMs);
      samples.push(sample);
    } catch {
      // Drop dead samples; keep going so a single lost packet doesn't kill sync.
    }
    if (i < sampleCount - 1) {
      await delay(gapMs);
    }
  }

  if (samples.length === 0) {
    throw new Error("clock sync failed: no samples completed");
  }
  return pickBestSample(samples);
}

function takeSample(
  transport: Pick<Transport, "broadcast">,
  nonce: number,
  register: (nonce: number, resolve: (msg: SyncResponseMessage) => void) => void,
  unregister: (nonce: number) => void,
  timeoutMs: number,
): Promise<SyncSample> {
  return new Promise<SyncSample>((resolve, reject) => {
    const t0 = performance.now();
    const timer = setTimeout(() => {
      unregister(nonce);
      reject(new Error(`sync sample ${nonce} timed out`));
    }, timeoutMs);

    register(nonce, (msg) => {
      clearTimeout(timer);
      unregister(nonce);
      const t1 = performance.now();
      const rtt = t1 - t0;
      const offset = msg.hostNow + rtt / 2 - t1;
      resolve({ rtt, offset });
    });

    transport.broadcast({ type: "sync-request", nonce });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
