import styles from "./ScoreFormula.module.css";

export interface ScoreFormulaProps {
  difficulty: number;
  correctCount: number;
  jokerActive: boolean;
  bonusMultiplier: number;
  totalScore: number;
}

export function ScoreFormula({ difficulty, correctCount, jokerActive, bonusMultiplier, totalScore }: ScoreFormulaProps) {
  if (correctCount === 0) {
    return <div className={styles.formula}><span className={styles.total}>0 🪙</span></div>;
  }

  const parts: string[] = [];
  parts.push(`( ${difficulty}🪙 × ${correctCount} )`);
  if (jokerActive) parts.push("× 2🃏");
  if (bonusMultiplier > 0) parts.push(`× ${bonusMultiplier.toFixed(1)}⌚`);

  return (
    <div className={styles.formula}>
      <span>{parts.join(" ")}</span>
      <span> = </span>
      <span className={styles.total}>{totalScore} 🪙</span>
    </div>
  );
}
