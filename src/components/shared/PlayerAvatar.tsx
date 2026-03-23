import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PlayerAvatarProps {
  name: string;
  emoji?: string;
  teamId?: string | null;
  isCaptain?: boolean;
  isOnline?: boolean;
  isReady?: boolean;
  hasAnswered?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  onClick?: () => void;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 3).toUpperCase();
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-10 h-10",
  lg: "w-14 h-14",
  xl: "w-28 h-28",
};

const emojiSizeClasses = {
  sm: "text-2xl",
  md: "text-3xl",
  lg: "text-5xl",
  xl: "text-8xl",
};

const initialsSizeClasses = {
  md: "text-[7px] px-1 py-px",
  lg: "text-[8px] px-1.5 py-0.5",
  xl: "text-xs px-2 py-0.5",
};

export function PlayerAvatar({
  name,
  emoji,
  teamId,
  isCaptain = false,
  isOnline = true,
  isReady = false,
  hasAnswered = false,
  size = "sm",
  onClick,
}: PlayerAvatarProps) {
  const initials = getInitials(name);

  const bgColor =
    teamId === "red"
      ? "bg-red-500 dark:bg-red-600"
      : teamId === "blue"
        ? "bg-blue-500 dark:bg-blue-600"
        : "bg-[#ccd] dark:bg-slate-500";

  const ringClass = hasAnswered
    ? "ring-2 ring-emerald-400 dark:ring-green-400"
    : isReady
      ? "ring-2 ring-emerald-400/60 dark:ring-green-400/60 animate-pulse"
      : isCaptain
        ? "ring-2 ring-amber-400 dark:ring-yellow-400"
        : "";

  // Animate emoji change (horizontal slide)
  const [displayEmoji, setDisplayEmoji] = useState(emoji);
  const [slideKey, setSlideKey] = useState(0);
  const prevEmojiRef = useRef(emoji);

  useEffect(() => {
    if (emoji !== prevEmojiRef.current) {
      prevEmojiRef.current = emoji;
      setSlideKey((k) => k + 1);
      setDisplayEmoji(emoji);
    }
  }, [emoji]);

  const initialsSize = initialsSizeClasses[size as keyof typeof initialsSizeClasses];

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full text-white font-bold select-none flex-shrink-0 overflow-hidden ${sizeClasses[size]} ${bgColor} ${ringClass} ${!isOnline ? "opacity-40 grayscale" : ""} ${onClick ? "cursor-pointer active:scale-95" : ""} transition-all duration-200`}
      onClick={onClick}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={slideKey}
          className={emojiSizeClasses[size]}
          role="img"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -40, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
        >
          {displayEmoji || "\u{1F464}"}
        </motion.span>
      </AnimatePresence>

      {size !== "sm" && initialsSize && (
        <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 bg-black/40 text-white leading-none rounded-full whitespace-nowrap ${initialsSize}`}>
          {initials}
        </span>
      )}
      {isCaptain && (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`absolute -top-1.5 -right-1.5 text-amber-500 dark:text-yellow-400 drop-shadow ${size === "xl" ? "w-7 h-7" : "w-4 h-4"}`}
        >
          <path d="M2.5 19h19v2h-19zM22.5 7l-5 5-5-7-5 7-5-5 2.5 12h15z" />
        </svg>
      )}
      {hasAnswered && (
        <div className={`absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full flex items-center justify-center ${size === "xl" ? "w-6 h-6" : "w-3.5 h-3.5"}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={4} className={size === "xl" ? "w-3.5 h-3.5" : "w-2 h-2"}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
