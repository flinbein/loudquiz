import { useMemo } from "react";
import { motion } from "framer-motion";
import type { StampVariant } from "./stampTexts";

interface StampProps {
  text: string;
  variant: StampVariant;
  animate?: boolean;
  delay?: number;
  size?: "sm" | "md";
}

const variantStyles = {
  correct: {
    border: "border-green-700 dark:border-green-400",
    text: "text-green-800 dark:text-green-300",
    bg: "bg-green-700/20 dark:bg-green-500/20",
  },
  incorrect: {
    border: "border-red-700 dark:border-red-400",
    text: "text-red-800 dark:text-red-300",
    bg: "bg-red-700/20 dark:bg-red-500/20",
  },
  "late-correct": {
    border: "border-slate-800 dark:border-slate-300",
    text: "text-slate-900 dark:text-slate-200",
    bg: "bg-slate-800/20 dark:bg-slate-400/20",
  },
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-[9px] border-2",
  md: "px-4 py-2 text-xs border-[3px]",
};

export function Stamp({
  text,
  variant,
  animate = true,
  delay = 0,
  size = "md",
}: StampProps) {
  const styles = variantStyles[variant];
  const rotation = useMemo(() => Math.floor(Math.random() * 16) - 8, []);

  const inner = (
    <span className="relative z-10 leading-tight text-center whitespace-nowrap">
      {text}
    </span>
  );

  const className = `inline-flex items-center justify-center rounded-sm ${sizeStyles[size]} ${styles.border} ${styles.bg} ${styles.text} mix-blend-multiply dark:mix-blend-screen font-bold uppercase tracking-wider select-none pointer-events-none`;

  if (!animate) {
    return (
      <div className={className} style={{ transform: `rotate(${rotation}deg)` }}>
        {inner}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ scale: 2.5, opacity: 0, rotate: rotation - 5 }}
      animate={{ scale: 1, opacity: 1, rotate: rotation }}
      transition={{
        delay,
        duration: 0.25,
        ease: [0.22, 1, 0.36, 1],
        scale: { type: "spring", damping: 12, stiffness: 300, delay },
      }}
    >
      {inner}
    </motion.div>
  );
}

export type { StampProps };
