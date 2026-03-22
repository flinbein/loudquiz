interface PlayerAvatarProps {
  name: string;
  teamId?: string | null;
  isCaptain?: boolean;
  isOnline?: boolean;
  isReady?: boolean;
  hasAnswered?: boolean;
  size?: "sm" | "md" | "lg";
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-base",
};

export function PlayerAvatar({
  name,
  teamId,
  isCaptain = false,
  isOnline = true,
  isReady = false,
  hasAnswered = false,
  size = "sm",
}: PlayerAvatarProps) {
  const initials = getInitials(name);

  const bgColor =
    teamId === "red"
      ? "bg-red-500 dark:bg-red-600"
      : teamId === "blue"
        ? "bg-blue-500 dark:bg-blue-600"
        : "bg-slate-400 dark:bg-slate-500";

  const ringClass = hasAnswered
    ? "ring-2 ring-emerald-400 dark:ring-green-400"
    : isReady
      ? "ring-2 ring-emerald-400/60 dark:ring-green-400/60 animate-pulse"
      : isCaptain
        ? "ring-2 ring-amber-400 dark:ring-yellow-400"
        : "";

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full text-white font-bold select-none flex-shrink-0 ${sizeClasses[size]} ${bgColor} ${ringClass} ${!isOnline ? "opacity-40 grayscale" : ""} transition-all duration-200`}>
      {initials}
      {isCaptain && (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 text-amber-500 dark:text-yellow-400 drop-shadow"
        >
          <path d="M2.5 19h19v2h-19zM22.5 7l-5 5-5-7-5 7-5-5 2.5 12h15z" />
        </svg>
      )}
      {hasAnswered && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={4} className="w-2 h-2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}
