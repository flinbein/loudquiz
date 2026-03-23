import type { PublicPlayerInfo } from "../../game/types";
import { PlayerAvatar } from "./PlayerAvatar";
import { TypingDots } from "./TypingDots";

interface TeamStatusBlockProps {
  players: PublicPlayerInfo[];
  captainId?: string | null;
  showBlitzOrder?: boolean;
  showTypingIndicator?: boolean;
}

export function TeamStatusBlock({
  players,
  captainId,
  showBlitzOrder = false,
  showTypingIndicator = false,
}: TeamStatusBlockProps) {
  const sorted = [...players].sort((a, b) => {
    if (a.id === captainId) return -1;
    if (b.id === captainId) return 1;
    if (showBlitzOrder) {
      return (a.blitzOrder ?? 999) - (b.blitzOrder ?? 999);
    }
    return 0;
  });

  return (
    <div className="space-y-1.5">
      {sorted.map((p) => {
        const isCaptain = p.id === captainId;
        const showDots = showTypingIndicator && !isCaptain && !p.hasAnswered && p.online;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
              isCaptain
                ? "bg-amber-50/80 dark:bg-yellow-900/20 border border-amber-200 dark:border-yellow-700/30"
                : "bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/30"
            } ${!p.online ? "opacity-50" : ""}`}
          >
            <PlayerAvatar
              name={p.name}
              emoji={p.emoji}
              teamId={p.teamId}
              isCaptain={isCaptain}
              isOnline={p.online}
              hasAnswered={p.hasAnswered}
              isReady={p.isReady}
              size="sm"
            />
            {showBlitzOrder && !isCaptain && (
              <span className="text-slate-400 dark:text-slate-500 text-xs font-mono flex-shrink-0">
                {(p.blitzOrder ?? 0) > 0 ? `${p.blitzOrder}.` : "?"}
              </span>
            )}
            <span
              className={`flex-1 font-medium truncate ${
                isCaptain
                  ? "text-amber-700 dark:text-yellow-300"
                  : p.hasAnswered
                    ? "text-emerald-600 dark:text-green-400"
                    : "text-slate-700 dark:text-slate-300"
              }`}
            >
              {p.name}
            </span>
            {showDots && (
              <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">
                <TypingDots />
              </span>
            )}
            {!p.online && (
              <span className="text-slate-400 dark:text-slate-600 text-xs flex-shrink-0">
                офлайн
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
