import { useState, type ComponentProps, useMemo } from "react";
import { Sticker } from "@/components/Sticker/Sticker";
import styles from "./StickerStack.module.css";

export interface StickerStackProps {
  stickers: ComponentProps<typeof Sticker>[];
  onClickBadge?: (index: number) => void;
  onClickSticker?: () => void;
}

export function StickerStack({ stickers, onClickBadge, onClickSticker }: StickerStackProps) {
  const [topIndex, setTopIndex] = useState(0);

  if (stickers.length === 0) return null;

  if (stickers.length === 1) {
    return <Sticker {...stickers[0]} onClickSticker={onClickSticker} />;
  }

  const current = stickers[topIndex % stickers.length];

  function handleCycle() {
    setTopIndex((i) => (i + 1) % stickers.length);
  }

  function handleBadgeClick() {
    onClickBadge?.(topIndex)
  }
  
  const nextBgStickers = useMemo(() => {
    return [...stickers, ...stickers].slice(topIndex, topIndex + Math.min(stickers.length - 1, 2))
  }, [stickers, topIndex]);

  return (
    <div className={styles.stack}>
      {nextBgStickers.map((stickerProps, i) => (
        <div key={i} className={styles.backdrop} >
          <Sticker {...stickerProps} hideAvatar />
        </div>
      ))}
      <div className={styles.top}>
        <Sticker key={topIndex} {...current} onClickAvatar={handleCycle} onClickSticker={onClickSticker} />
      </div>
      <div className={styles.badge} onClick={handleBadgeClick}>
        {stickers.length}
      </div>
    </div>
  );
}
