import { Link } from "react-router-dom";
import { ThemeToggle } from "../shared/ThemeToggle";
import { AnimatedScore } from "../shared/AnimatedScore";

interface HostLayoutProps {
  roomId: string;
  modeLabel: string;
  teamsLabel: string;
  hostLabel: string;
  scores: Record<string, number>;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function HostLayout({
  roomId,
  modeLabel,
  teamsLabel,
  hostLabel,
  scores,
  sidebar,
  children,
}: HostLayoutProps) {
  return (
    <div className="min-h-[100dvh] bg-game text-slate-900 dark:text-white">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm transition-all"
          >
            &larr; Главная
          </Link>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Ведущий</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <span>{modeLabel}</span>
          <span>·</span>
          <span>{teamsLabel}</span>
          <span>·</span>
          <span>{hostLabel}</span>
          <span>·</span>
          <span className="font-mono text-indigo-600 dark:text-indigo-400">{roomId}</span>
          <span>·</span>
          <div className="flex gap-3">
            {Object.entries(scores).map(([teamId, score]) => (
              <span
                key={teamId}
                className={`font-bold ${
                  teamId === "red"
                    ? "text-red-500 dark:text-red-400"
                    : "text-blue-500 dark:text-blue-400"
                }`}
              >
                {teamId === "red" ? "Кр" : "Си"}: <AnimatedScore value={score} />
              </span>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-6xl mx-auto">
        {sidebar ? (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">{children}</div>
            {sidebar}
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
