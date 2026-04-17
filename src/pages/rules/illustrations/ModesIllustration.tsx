// src/pages/rules/illustrations/ModesIllustration.tsx
import styles from "./illustrations.module.css";

export function ModesIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.modesGrid}>
        <div className={styles.modeCard}>
          <span className={styles.modeIcon}>🤝</span>
          <span className={styles.modeLabel}>1 team</span>
        </div>
        <div className={styles.modeCard}>
          <span className={styles.modeIcon}>⚔️</span>
          <span className={styles.modeLabel}>2 teams</span>
        </div>
        <div className={styles.modeCard}>
          <span className={styles.modeIcon}>🤖</span>
          <span className={styles.modeLabel}>AI</span>
        </div>
      </div>
    </div>
  );
}
