import type { PublicPlayerInfo } from "../../game/types";

interface TeamStatusBlockProps {
  players: PublicPlayerInfo[];
  captainId?: string | null;
  showBlitzOrder?: boolean;
}

export function TeamStatusBlock({
  players,
  captainId,
  showBlitzOrder = false,
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
    <div className="space-y-1">
      {sorted.map((p) => {
        const isCaptain = p.id === captainId;
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
              isCaptain
                ? "bg-yellow-900/20 border border-yellow-700/30"
                : "bg-gray-800 border border-gray-700/30"
            } ${!p.online ? "opacity-60" : ""}`}
          >
            {isCaptain && (
              <span className="text-yellow-400 flex-shrink-0 text-base" title="Капитан">
                👑
              </span>
            )}
            {!isCaptain && showBlitzOrder && (
              <span className="text-gray-500 w-5 text-center text-xs flex-shrink-0">
                {(p.blitzOrder ?? 0) > 0 ? `${p.blitzOrder}.` : "?"}
              </span>
            )}
            <span
              className={`flex-1 font-medium ${
                isCaptain
                  ? "text-yellow-300"
                  : p.hasAnswered
                    ? "text-green-400"
                    : "text-gray-300"
              }`}
            >
              {p.name}
            </span>
            {!p.online && (
              <span className="text-gray-600 text-xs flex-shrink-0">(офлайн)</span>
            )}
            {p.hasAnswered ? (
              <span className="text-green-400 flex-shrink-0 text-base" title="Ответил">
                ✓
              </span>
            ) : (
              <span className="text-gray-500 flex-shrink-0 text-sm" title="Не ответил">
                ✏️
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
