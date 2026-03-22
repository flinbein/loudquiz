interface CircularTimerProps {
  remaining: number; // seconds remaining
  total: number; // total seconds
  size?: number; // px, default 160
  strokeWidth?: number; // px, default 8
  variant?: "player" | "host";
  label?: string;
}

export function CircularTimer({
  remaining,
  total,
  size: sizeProp,
  strokeWidth: strokeProp,
  variant = "player",
  label,
}: CircularTimerProps) {
  const size = sizeProp ?? (variant === "host" ? 200 : 160);
  const strokeWidth = strokeProp ?? (variant === "host" ? 10 : 8);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, remaining / total));
  const offset = circumference * (1 - progress);
  const center = size / 2;

  // Color transition: green > 50%, yellow 25-50%, red < 25%
  const colorClass =
    remaining <= 10
      ? "text-red-500 dark:text-red-400"
      : progress < 0.25
        ? "text-red-500 dark:text-red-400"
        : progress < 0.5
          ? "text-amber-500 dark:text-yellow-400"
          : "text-emerald-500 dark:text-green-400";

  const isUrgent = remaining <= 10;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeStr =
    minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, "0")}`
      : `${seconds}`;

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${isUrgent ? "animate-count-pulse" : ""}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Progress ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`timer-ring transition-colors duration-500 ${colorClass}`}
          stroke="currentColor"
        />
      </svg>
      {/* Time text */}
      <span
        className={`absolute font-mono font-bold ${
          size >= 180 ? "text-5xl" : size >= 140 ? "text-4xl" : size >= 100 ? "text-2xl" : "text-xl"
        } ${
          isUrgent
            ? "text-red-500 dark:text-red-400"
            : "text-slate-800 dark:text-slate-100"
        }`}
      >
        {timeStr}
      </span>
      {label && (
        <span className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
}
