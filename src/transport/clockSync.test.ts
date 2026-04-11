import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pickBestSample, runSyncHandshake, type SyncSample } from "./clockSync";
import type {
  Message,
  SyncRequestMessage,
  SyncResponseMessage,
  Transport,
} from "@/transport/interface";

describe("pickBestSample", () => {
  it("returns the offset of the sample with the smallest RTT", () => {
    const samples: SyncSample[] = [
      { rtt: 300, offset: 1000 },
      { rtt: 50, offset: 1234 }, // winner
      { rtt: 120, offset: 1100 },
    ];
    expect(pickBestSample(samples)).toBe(1234);
  });

  it("handles a single sample", () => {
    expect(pickBestSample([{ rtt: 42, offset: -777 }])).toBe(-777);
  });

  it("throws on empty input", () => {
    expect(() => pickBestSample([])).toThrowError(/no samples/);
  });
});

/**
 * Minimal transport stub that captures broadcast sync-requests and lets the
 * test drive a simulated host reply + a simulated clock skew.
 */
function createFakeTransport(hostClockOffset: number, latencyMs: number) {
  const pending = new Map<number, (msg: SyncResponseMessage) => void>();
  // Model symmetric network delay: request takes latencyMs/2 to reach host,
  // host captures its clock there, response takes latencyMs/2 back. This
  // matches the assumption baked into Cristian's algorithm, so the estimator
  // should recover `hostClockOffset` exactly (modulo scheduler noise).
  const halfLatency = latencyMs / 2;

  const transport: Pick<Transport, "broadcast"> = {
    broadcast(message: Message) {
      if (message.type !== "sync-request") return;
      const req = message as SyncRequestMessage;
      setTimeout(() => {
        const hostNow = performance.now() + hostClockOffset;
        setTimeout(() => {
          const cb = pending.get(req.nonce);
          cb?.({ type: "sync-response", nonce: req.nonce, hostNow });
        }, halfLatency);
      }, halfLatency);
    },
  };

  const register = (nonce: number, cb: (msg: SyncResponseMessage) => void) => {
    pending.set(nonce, cb);
  };
  const unregister = (nonce: number) => {
    pending.delete(nonce);
  };

  return { transport, register, unregister };
}

describe("runSyncHandshake", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("converges on the injected host-clock offset", async () => {
    const HOST_OFFSET = 5000; // host is 5s "ahead" of player
    const LATENCY = 40;
    const { transport, register, unregister } = createFakeTransport(HOST_OFFSET, LATENCY);

    const promise = runSyncHandshake(transport, register, unregister, {
      sampleCount: 3,
      gapMs: 10,
      timeoutMs: 1000,
    });

    await vi.runAllTimersAsync();
    const offset = await promise;

    // With symmetric latency, the estimator should land near HOST_OFFSET.
    // Allow ±5 ms for scheduler noise.
    expect(offset).toBeGreaterThan(HOST_OFFSET - 5);
    expect(offset).toBeLessThan(HOST_OFFSET + 5);
  });

  it("rejects when every sample times out", async () => {
    const silent: Pick<Transport, "broadcast"> = { broadcast: () => {} };
    const pending = new Map<number, (msg: SyncResponseMessage) => void>();
    const register = (n: number, cb: (msg: SyncResponseMessage) => void) => {
      pending.set(n, cb);
    };
    const unregister = (n: number) => {
      pending.delete(n);
    };

    const promise = runSyncHandshake(silent, register, unregister, {
      sampleCount: 2,
      gapMs: 5,
      timeoutMs: 20,
    });

    // Swallow the rejection synchronously so Vitest doesn't flag an
    // unhandled rejection while we advance timers.
    const captured = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await captured;

    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toMatch(/no samples completed/);
  });
});
