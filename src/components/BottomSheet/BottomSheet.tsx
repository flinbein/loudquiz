import { useEffect, useRef } from "react";
import styles from "./BottomSheet.module.css";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}

/**
 * Bottom-anchored modal sheet. Backdrop click, Escape, and swipe-down on the
 * handle all call `onClose`. Focus is moved into the dialog on open and
 * returned to the previously-focused element on close.
 *
 * Not rendered at all when `open=false` — no reservation of DOM, no tick work.
 */
export function BottomSheet({
  open,
  onClose,
  ariaLabel,
  children,
}: BottomSheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      data-testid="bottom-sheet-backdrop"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={styles.card}
        onClick={(e) => e.stopPropagation()}
      >
        <SwipeHandle onClose={onClose} />
        {children}
      </div>
    </div>
  );
}

function SwipeHandle({ onClose }: { onClose: () => void }) {
  const startY = useRef<number | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startY.current == null) return;
    const delta = e.clientY - startY.current;
    if (delta > 60) {
      startY.current = null;
      onClose();
    }
  }

  function onPointerUp() {
    startY.current = null;
  }

  return (
    <div
      className={styles.handle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
