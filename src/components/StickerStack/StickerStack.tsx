import { useState, type ComponentProps, useMemo, type DragEvent } from "react";
import cn from "classnames";
import { Sticker } from "@/components/Sticker/Sticker";
import styles from "./StickerStack.module.css";

export interface StickerStackProps {
  stickers: ComponentProps<typeof Sticker>[];
  onClickBadge?: (index: number) => void;
  onClickSticker?: () => void;
  draggable?: boolean;
  dragData?: string;
  onDrop?: (dragData: string) => void;
}

export function StickerStack({ stickers, onClickBadge, onClickSticker, draggable, dragData, onDrop }: StickerStackProps) {
  const [topIndex, setTopIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDropOver, setIsDropOver] = useState(false);

  if (stickers.length === 0) return null;

  function handleDragStart(e: DragEvent) {
    if (!dragData) return;
    e.dataTransfer.setData("text/plain", dragData);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  }

  function handleDragEnd() {
    setIsDragging(false);
  }

  function handleDragOver(e: DragEvent) {
    if (!onDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDropOver(true);
  }

  function handleDragLeave() {
    setIsDropOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setIsDropOver(false);
    const data = e.dataTransfer.getData("text/plain");
    if (data && data !== dragData) {
      onDrop?.(data);
    }
  }

  if (stickers.length === 1) {
    return (
      <div
        className={cn(styles.stack, styles.single)}
        draggable={draggable}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        data-drop-over={isDropOver || undefined}
      >
        <Sticker {...stickers[0]} onClickSticker={onClickSticker} />
      </div>
    );
  }

  const current = stickers[topIndex % stickers.length];

  function handleCycle() {
    setTopIndex((i) => (i + 1) % stickers.length);
  }

  function handleBadgeClick() {
    onClickBadge?.(topIndex);
  }

  const nextBgStickers = useMemo(() => {
    return [...stickers, ...stickers].slice(topIndex, topIndex + Math.min(stickers.length - 1, 2));
  }, [stickers, topIndex]);

  return (
    <div
      className={styles.stack}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-dragging={isDragging || undefined}
      data-drop-over={isDropOver || undefined}
    >
      {nextBgStickers.map((stickerProps, i) => (
        <div key={i} className={styles.backdrop}>
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
