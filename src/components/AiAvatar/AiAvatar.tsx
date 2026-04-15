import styles from "./AiAvatar.module.css";

export function AiAvatar() {
  return (
    <span className={styles.avatar} role="img" aria-label="AI">
      <span className={styles.emoji}>🤖</span>
    </span>
  );
}
