/**
 * Programmatic answer validation for blitz rounds.
 *
 * Normalization rules (see spec/game/blitz.md §"Проверка ответа"):
 * - case-insensitive
 * - `ё` ↔ `е` are equivalent
 * - whitespace and any non-letter/digit characters are stripped
 *
 * An answer is correct if its normalized form equals the normalized form of
 * any accepted variant of the blitz item text. Normally a blitz item has a
 * single canonical form; the function accepts an array so call sites can
 * extend later (e.g. plural/synonym lists) without changing the signature.
 */
export function normalizeBlitzAnswer(input: string): string {
  return input
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function checkBlitzAnswer(
  answer: string,
  acceptedVariants: string[],
): boolean {
  if (!answer) return false;
  const normalized = normalizeBlitzAnswer(answer);
  if (!normalized) return false;
  return acceptedVariants.some(
    (v) => normalizeBlitzAnswer(v) === normalized,
  );
}
