import type { Transport } from "./interface";
import { createBroadcastChannelTransport } from "./broadcastChannel";
import { createP2PTTransport, type P2PTRole } from "./p2pt";

function useBroadcastTransport(): boolean {
  try {
    return localStorage.getItem("__TRANSPORT__") === "broadcast";
  } catch {
    return false;
  }
}

export function createTransport(_roomId: string, role: P2PTRole = "host"): Transport {
  if (useBroadcastTransport()) {
    return createBroadcastChannelTransport();
  }
  return createP2PTTransport(role);
}
