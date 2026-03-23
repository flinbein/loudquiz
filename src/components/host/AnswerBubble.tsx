import { motion } from "framer-motion";
import { PlayerAvatar } from "../shared/PlayerAvatar";

interface AnswerBubbleProps {
  playerName: string;
  playerEmoji?: string;
  teamId?: string;
  answer: string;
  accepted: boolean;
  note?: string;
  index: number;
}

export function AnswerBubble({
  playerName,
  playerEmoji,
  teamId,
  answer,
  accepted,
  note,
  index,
}: AnswerBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: index * 0.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3"
    >
      <PlayerAvatar name={playerName} emoji={playerEmoji} teamId={teamId} size="md" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{playerName}</p>
        <div
          className={`relative rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-xs ${
            accepted
              ? "bg-emerald-100 dark:bg-green-900/30 border border-emerald-200 dark:border-green-700/40"
              : "bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30"
          }`}
        >
          <span
            className={`font-medium ${
              accepted
                ? "text-emerald-800 dark:text-green-200"
                : "text-red-700 dark:text-red-300 line-through"
            }`}
          >
            {answer || "—"}
          </span>
          {note && (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1">{note}</p>
          )}
          {/* Status icon */}
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
            {accepted ? (
              <span className="bg-emerald-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            ) : (
              <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
