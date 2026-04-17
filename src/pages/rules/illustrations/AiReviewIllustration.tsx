// src/pages/rules/illustrations/AiReviewIllustration.tsx
import { Sticker } from "@/components/Sticker/Sticker";
import { AiCommentBubble } from "@/components/AiCommentBubble/AiCommentBubble";
import styles from "./illustrations.module.css";

export function AiReviewIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.aiReviewColumn}>
        <div className={styles.stickerWrap}>
          <Sticker
            answerText="Марс"
            stampText="✓"
            stampColor="green"
            player={{ emoji: "🎧", name: "Alice", team: "red" }}
            hideAvatar
          />
        </div>
        <AiCommentBubble text="Марс — четвёртая планета, принято!" charDelayMs={0} />
      </div>
    </div>
  );
}
