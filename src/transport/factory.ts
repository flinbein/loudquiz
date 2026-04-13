import type { Transport } from "./interface";
import { createBroadcastChannelTransport } from "./broadcastChannel";

function useBroadcastTransport(): boolean {
  try {
    return localStorage.getItem("__TRANSPORT__") === "broadcast";
  } catch {
    return false;
  }
}

export function createTransport(_roomId: string): Transport {
  if (useBroadcastTransport()) {
    return createBroadcastChannelTransport();
  }
  // p2pt transport — will be implemented in Task 4
  throw new Error("p2pt transport not implemented yet");
}
