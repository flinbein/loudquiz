const BACKEND_URL_KEY = "backendUrl";
export const DEFAULT_BACKEND = "https://varhub.flinbein.ru/";

export function getBackendUrl(): string {
  try {
    return localStorage.getItem(BACKEND_URL_KEY) || DEFAULT_BACKEND;
  } catch {
    return DEFAULT_BACKEND;
  }
}

export function setBackendUrl(url: string): void {
  try {
    localStorage.setItem(BACKEND_URL_KEY, url.trim() || DEFAULT_BACKEND);
  } catch {}
}

/**
 * Build the full URL for a room (used for QR code and sharing).
 * Accepts optional origin/base for testability.
 */
export function buildRoomUrl(
  roomId: string,
  origin = typeof window !== "undefined" ? window.location.origin : "",
  base = typeof import.meta !== "undefined" ? (import.meta.env?.BASE_URL ?? "/") : "/"
): string {
  const cleanBase = (base || "/").replace(/\/$/, "");
  return `${origin}${cleanBase}/${roomId}`;
}

export function isValidRoomId(roomId: string): boolean {
  return typeof roomId === "string" && /^[a-zA-Z0-9_-]{4,}$/.test(roomId.trim());
}
