import { useState, type ComponentProps } from "react";
import { Sticker } from "@/components/Sticker/Sticker";
import styles from "./StickerStack.module.css";

export interface StickerStackProps {
  stickers: ComponentProps<typeof Sticker>[];
  onSplit?: () => void;
}

export function StickerStack({ stickers, onSplit }: StickerStackProps) {
  const [topIndex, setTopIndex] = useState(0);

  if (stickers.length === 0) return null;

  if (stickers.length === 1) {
    return <Sticker {...stickers[0]} />;
  }

  const current = stickers[topIndex % stickers.length];

  function handleCycle(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest(`.${styles.badge}`)) return;
    setTopIndex((i) => i + 1);
  }

  function handleBadgeClick(e: React.MouseEvent) {
    e.stopPropagation();
    onSplit?.();
  }

  return (
    <div className={styles.stack} onClick={handleCycle}>
      {stickers.slice(0, 2).map((_, i) => (
        <div key={i} className={styles.backdrop} />
      ))}
      <div className={styles.top}>
        <Sticker {...current} />
      </div>
      <div className={styles.badge} onClick={handleBadgeClick}>
        {stickers.length}
      </div>
    </div>
  );
}
