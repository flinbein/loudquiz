import { AnimatedScore } from "./AnimatedScore";

interface LEDScoreProps {
  value: number;
  teamId: string;
  label?: string;
  size?: "md" | "lg";
}

export function LEDScore({
  value,
  teamId,
  label,
  size = "lg",
}: LEDScoreProps) {
  const colorClass =
    teamId === "red"
      ? "text-red-500 dark:text-red-400"
      : "text-blue-500 dark:text-blue-400";

  const glowStyle =
    teamId === "red"
      ? { textShadow: "0 0 10px currentColor, 0 0 20px rgba(239, 68, 68, 0.4)" }
      : { textShadow: "0 0 10px currentColor, 0 0 20px rgba(59, 130, 246, 0.4)" };

  const sizeClass = size === "lg" ? "text-5xl" : "text-3xl";

  return (
    <div className="text-center">
      {label && (
        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${colorClass} opacity-70`}>
          {label}
        </p>
      )}
      <div
        className={`font-mono font-black ${sizeClass} ${colorClass} tabular-nums`}
        style={glowStyle}
      >
        <AnimatedScore value={value} />
      </div>
    </div>
  );
}
