import { type ReactNode } from "react";

interface GameCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "elevated" | "accent" | "team-red" | "team-blue";
}

const variantClasses: Record<string, string> = {
  default:
    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
  elevated:
    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg dark:shadow-slate-900/50",
  accent:
    "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/50",
  "team-red":
    "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50",
  "team-blue":
    "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50",
};

export function GameCard({
  children,
  className = "",
  variant = "default",
}: GameCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
