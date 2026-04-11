import styles from "./ScoreFormula.module.css";

export interface ScoreFormulaProps {
  difficulty: number;
  correctCount: number;
  jokerActive: boolean;
  bonusTimeMultiplier: number;
  bonusTimeApplied: boolean;
  totalScore: number;
}

export function ScoreFormula({ difficulty, correctCount, jokerActive, bonusTimeMultiplier, bonusTimeApplied, totalScore }: ScoreFormulaProps) {
  if (correctCount === 0) {
    return <div className={styles.formula}><span className={styles.total}>0 🪙</span></div>;
  }

  const parts: string[] = [];
  parts.push(`( ${difficulty}🪙 × ${correctCount} )`);
  if (jokerActive) parts.push("× 2🃏");
  if (bonusTimeApplied) parts.push(`× ${bonusTimeMultiplier.toFixed(2)}⌚`);

  return (
    <div className={styles.formula}>
      <span>{parts.join(" ")}</span>
      <span> = </span>
      <span className={styles.total}>{totalScore} 🪙</span>
    </div>
  );
}
