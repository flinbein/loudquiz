import { AnimatedScore } from "../shared/AnimatedScore";
import { TeamStatusBlock } from "../shared/TeamStatusBlock";
import type { PublicPlayerInfo } from "../../game/types";

interface HostSidebarProps {
  scores: Record<string, number>;
  players: PublicPlayerInfo[];
  captainId?: string | null;
  activeTeamId?: string | null;
  phase: string;
  jokerUsed?: Record<string, boolean>;
  jokerActivatedThisRound?: Record<string, boolean>;
  totalRounds?: number;
  completedRounds?: number;
  showBlitzOrder?: boolean;
  teamCount: 1 | 2;
  children?: React.ReactNode;
}

function TeamLabel({ teamId }: { teamId: string }) {
  if (teamId === "red") return <span className="text-red-500 dark:text-red-400">Красные</span>;
  if (teamId === "blue") return <span className="text-blue-500 dark:text-blue-400">Синие</span>;
  return <span>Команда</span>;
}

export function HostSidebar({
  scores,
  players,
  captainId,
  activeTeamId,
  phase,
  jokerUsed = {},
  jokerActivatedThisRound = {},
  totalRounds = 0,
  completedRounds = 0,
  showBlitzOrder = false,
  teamCount,
  children,
}: HostSidebarProps) {
  const teamIds = teamCount === 2 ? ["red", "blue"] : ["red"];

  return (
    <aside className="w-full lg:w-80 shrink-0 space-y-4">
      {/* Scores */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Счёт</h3>
        {teamIds.map((teamId) => (
          <div
            key={teamId}
            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
              teamId === activeTeamId
                ? "bg-amber-50/80 dark:bg-yellow-900/20 ring-1 ring-amber-300 dark:ring-yellow-700/50"
                : "bg-slate-50 dark:bg-slate-700/30"
            }`}
          >
            <TeamLabel teamId={teamId} />
            <span className={`text-2xl font-bold font-mono tabular-nums ${
              teamId === "red" ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"
            }`}>
              <AnimatedScore value={scores[teamId] ?? 0} />
            </span>
          </div>
        ))}

        {/* Joker status */}
        {teamIds.map((teamId) => {
          const used = jokerUsed[teamId];
          const active = jokerActivatedThisRound[teamId];
          if (active) {
            return (
              <p key={teamId} className="text-amber-600 dark:text-yellow-400 text-xs font-bold text-center animate-count-pulse">
                Джокер x2 активирован!
              </p>
            );
          }
          if (!used) {
            return (
              <p key={teamId} className="text-slate-400 dark:text-slate-500 text-xs text-center">
                Джокер доступен
              </p>
            );
          }
          return null;
        })}
      </div>

      {/* Progress bar */}
      {totalRounds > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Прогресс</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {completedRounds}/{totalRounds}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-indigo-500 dark:bg-indigo-400 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${totalRounds > 0 ? (completedRounds / totalRounds) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Team players */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700/50 p-4">
        <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Команда</h3>
        <TeamStatusBlock
          players={players.filter((p) => p.teamId === activeTeamId && p.role === "player")}
          captainId={captainId}
          showBlitzOrder={showBlitzOrder}
          showTypingIndicator={
            phase === "round-active" ||
            phase === "round-answer" ||
            phase === "blitz-active" ||
            phase === "blitz-answer"
          }
        />
      </div>

      {/* Phase-specific actions */}
      {children}
    </aside>
  );
}
