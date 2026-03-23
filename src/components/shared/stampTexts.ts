export type StampVariant = "correct" | "incorrect" | "late-correct";

const INCORRECT_TEXTS = ["ПЛОХО", "ОТКЛОНЕНО", "НЕВЕРНО", "ОШИБКА", "НЕТ", "МИМО"];
const LATE_CORRECT_TEXTS = ["ЖАЛЬ", "ХОРОШАЯ ПОПЫТКА", "БЕСПОЛЕЗНО", "ПОЗДНО", "НЕ В СЧЁТ"];

function pickRandom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pickStampText(variant: StampVariant, score?: number): string {
  if (variant === "correct" && score !== undefined) return `+${score}`;
  if (variant === "late-correct") return pickRandom(LATE_CORRECT_TEXTS);
  return pickRandom(INCORRECT_TEXTS);
}
