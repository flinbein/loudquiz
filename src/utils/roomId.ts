export function generateRoomId(): string {
  return Math.floor(Math.random() * 1_000_000_000)
    .toString()
    .padStart(9, "0");
}

export function formatRoomId(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function parseRoomId(input: string): string {
  return input.replace(/\D/g, "").slice(0, 9);
}
