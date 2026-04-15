import { useEffect, useRef } from "react";
import { AiAvatar } from "@/components/AiAvatar/AiAvatar";
import styles from "./AiCommentBubble.module.css";

export interface AiCommentBubbleProps {
  text: string;
  charDelayMs?: number;
}

export function AiCommentBubble({ text, charDelayMs = 15 }: AiCommentBubbleProps) {
  const visibleRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const visibleEl = visibleRef.current;
    const caretEl = caretRef.current;
    if (!visibleEl || !caretEl) return;

    visibleEl.textContent = "";
    caretEl.classList.add(styles.active!);

    let i = 0;
    const id = setInterval(() => {
      i++;
      visibleEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(id);
        caretEl.classList.remove(styles.active!);
      }
    }, charDelayMs);

    return () => clearInterval(id);
  }, [text, charDelayMs]);

  return (
    <div className={styles.container}>
      <div className={styles.avatarSlot}>
        <AiAvatar />
      </div>
      <div className={styles.bubble}>
        <span className={styles.ghost} data-testid="ai-bubble-ghost">{text}</span>
        <span className={styles.visibleWrap}>
          <span ref={visibleRef} data-testid="ai-bubble-visible" />
          <span ref={caretRef} className={styles.caret} aria-hidden="true">▌</span>
        </span>
        <span className={styles.signature}>— AI</span>
      </div>
    </div>
  );
}
