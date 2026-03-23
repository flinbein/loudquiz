import { useState } from "react";
import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "../shared/ThemeToggle";
import { AnimatedScore } from "../shared/AnimatedScore";

interface HostLayoutProps {
  roomId: string;
  roomUrl?: string;
  modeLabel: string;
  teamsLabel: string;
  hostLabel: string;
  scores: Record<string, number>;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function HostLayout({
  roomId,
  roomUrl,
  modeLabel,
  teamsLabel,
  hostLabel,
  scores,
  sidebar,
  children,
}: HostLayoutProps) {
  const [showQR, setShowQR] = useState(false);
  const url = roomUrl || `${window.location.origin}/${roomId}`;

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
          <button
            onClick={() => setShowQR(true)}
            className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            {roomId}
          </button>
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

      {/* QR Popup */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQR(false)}
          >
            <motion.div
              className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-2xl relative max-w-sm w-full mx-4 flex flex-col items-center gap-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowQR(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none transition-colors"
              >
                &times;
              </button>
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={url} size={240} />
              </div>
              <p className="text-4xl font-mono font-bold tracking-widest text-slate-900 dark:text-white">
                {roomId}
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all text-center"
              >
                {url}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
