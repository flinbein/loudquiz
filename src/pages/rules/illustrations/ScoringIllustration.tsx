// src/pages/rules/illustrations/ScoringIllustration.tsx
import { Sticker } from "@/components/Sticker/Sticker";
import { ScoreFormula } from "@/components/ScoreFormula/ScoreFormula";
import styles from "./illustrations.module.css";

export function ScoringIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.scoringColumn}>
        <div className={styles.stickersRow}>
          <div className={styles.stickerWrap}>
            <Sticker
              answerText="Гагарин"
              stampText="✓"
              stampColor="green"
              player={{ emoji: "🎧", name: "Alice", team: "red" }}
              hideAvatar
            />
          </div>
          <div className={styles.stickerWrap}>
            <Sticker
              answerText="Титов"
              stampText="✓"
              stampColor="green"
              player={{ emoji: "🎵", name: "Bob", team: "red" }}
              hideAvatar
            />
          </div>
          <div className={styles.stickerWrap}>
            <Sticker
              answerText="Космонавт"
              stampText="✗"
              stampColor="red"
              player={{ emoji: "🎶", name: "Carol", team: "red" }}
              hideAvatar
            />
          </div>
        </div>
        <ScoreFormula
          difficulty={150}
          correctCount={2}
          jokerActive={false}
          bonusTimeMultiplier={0}
          bonusTimeApplied={false}
          totalScore={300}
        />
      </div>
    </div>
  );
}
