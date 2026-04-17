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
            answerText="Mars"
            stampText="+100"
            stampColor="green"
            player={{ emoji: "🧜‍♀️", name: "Alice", team: "red" }}
          />
          <Sticker
            answerText="Snickers"
            stampText="×"
            stampColor="red"
            player={{ emoji: "🥷", name: "Bob", team: "red" }}
          />
        </div>
        <AiCommentBubble text="You were asked to name planets, not chocolate bars. One answer accepted." charDelayMs={0} />
      </div>
    </div>
  );
}
