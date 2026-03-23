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
    border: "border-green-700",
    text: "text-green-800",
  },
  incorrect: {
    border: "border-red-700",
    text: "text-red-800",
  },
  "late-correct": {
    border: "border-slate-800",
    text: "text-slate-900",
  },
};

const sizeStyles = {
  sm: "px-1 py-1 text-lg border-2",
  md: "px-1 py-2 text-md border-[3px]",
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

  const className = `inline-flex items-center justify-center rounded-sm ${sizeStyles[size]} ${styles.border} ${styles.text} mix-blend-multiply font-bold uppercase tracking-wider select-none pointer-events-none`;

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
