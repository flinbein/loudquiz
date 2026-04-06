import type { Transport } from "./interface";
import { createBroadcastChannelTransport } from "./broadcastChannel";

export type TransportPrefix = "b" | "p" | "v";

export function getTransportPrefix(roomId: string): TransportPrefix {
  const prefix = roomId.split("-")[0];
  if (prefix === "b" || prefix === "p" || prefix === "v") {
    return prefix;
  }
  throw new Error(`Unknown transport prefix in roomId: ${roomId}`);
}

export function createTransport(roomId: string): Transport {
  const prefix = getTransportPrefix(roomId);

  switch (prefix) {
    case "b":
      return createBroadcastChannelTransport();
    case "p":
      // TODO: p2pt transport (Phase 10)
      throw new Error("p2pt transport not implemented yet");
    case "v":
      // TODO: VarHub transport (Phase 10)
      throw new Error("VarHub transport not implemented yet");
  }
}
