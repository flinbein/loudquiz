import type { GameState } from "@/types/game";

const SESSION_KEY = "loud-quiz-game-state";

export function saveGameState(state: GameState): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may be full or unavailable
  }
}

export function loadGameState(): GameState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearGameState(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isHost(): boolean {
  return sessionStorage.getItem(SESSION_KEY) !== null;
}

const ROOM_KEY = "loud-quiz-room-id";

export function saveRoomId(roomId: string): void {
  try {
    sessionStorage.setItem(ROOM_KEY, roomId);
  } catch {
    // sessionStorage may be full or unavailable
  }
}

export function loadRoomId(): string | null {
  try {
    return sessionStorage.getItem(ROOM_KEY);
  } catch {
    return null;
  }
}

export function clearRoomId(): void {
  sessionStorage.removeItem(ROOM_KEY);
}
