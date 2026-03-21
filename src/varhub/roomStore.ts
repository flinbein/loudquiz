import type { RoomSocketHandler } from "@flinbein/varhub-web-client";
import type { GameSettings } from "../game/types";

export interface StoredRoom {
  room: RoomSocketHandler;
  settings: GameSettings;
}

let stored: StoredRoom | null = null;

export function storeRoom(room: RoomSocketHandler, settings: GameSettings): void {
  stored = { room, settings };
}

export function getStoredRoom(): StoredRoom | null {
  return stored;
}

export function clearStoredRoom(): void {
  stored = null;
}
