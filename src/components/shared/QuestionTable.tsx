import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PublicTopicRow } from "../../game/types";

interface QuestionHistoryEntry {
  questionId: string;
  teamId: string;
  score: number;
}

interface QuestionTableProps {
  questionTable: PublicTopicRow[];
  activeQuestionId?: string;
  questionHistory?: QuestionHistoryEntry[];
  onPick?: ((topicIdx: number, questionIdx: number) => void) | null;
  compact?: boolean;
}

export function QuestionTable({
  questionTable,
  activeQuestionId,
  questionHistory = [],
  onPick,
  compact = false,
}: QuestionTableProps) {
  if (questionTable.length === 0) return null;

  const historyMap = new Map(questionHistory.map((h) => [h.questionId, h]));
  const topicCount = questionTable.length;

  return (
    <div className="w-full space-y-3">
      {/* Topic headers */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${topicCount}, minmax(0, 1fr))` }}
      >
        {questionTable.map((topic, ti) => (
          <div
            key={ti}
            className="px-3 py-2.5 text-center font-semibold text-xs rounded-xl
              bg-gradient-to-b from-indigo-100 to-indigo-50 text-indigo-800
              dark:from-indigo-900/60 dark:to-indigo-900/30 dark:text-indigo-200
              border border-indigo-200/50 dark:border-indigo-700/30"
          >
            {topic.topicName}
          </div>
        ))}
      </div>

      {/* Question cards grid */}
      {questionTable[0]?.questions.map((_, qi) => (
        <div
          key={qi}
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${topicCount}, minmax(0, 1fr))` }}
        >
          {questionTable.map((topic, ti) => {
            const q = topic.questions[qi];
            if (!q) return <div key={ti} />;

            const history = historyMap.get(q.id);
            const isActive = q.id === activeQuestionId;
            const isAnswered = !!history;
            const clickable = !q.used && !isAnswered && !!onPick;
            const isUntouched = !q.used && !isAnswered && !isActive;

            return (
              <QuestionCard
                key={q.id}
                difficulty={q.difficulty}
                isActive={isActive}
                isAnswered={isAnswered}
                isUsed={q.used}
                clickable={clickable}
                isUntouched={isUntouched}
                compact={compact}
                teamId={history?.teamId}
                score={history?.score}
                onClick={() => clickable && onPick?.(ti, qi)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Individual card with flip animation ─────────────────────────────── */

interface QuestionCardProps {
  difficulty: number;
  isActive: boolean;
  isAnswered: boolean;
  isUsed: boolean;
  clickable: boolean;
  isUntouched: boolean;
  compact: boolean;
  teamId?: string;
  score?: number;
  onClick: () => void;
}

function QuestionCard({
  difficulty,
  isActive,
  isAnswered,
  isUsed,
  clickable,
  isUntouched,
  compact,
  teamId,
  score,
  onClick,
}: QuestionCardProps) {
  // Track flip state: when a card becomes "answered", trigger flip
  const [flipped, setFlipped] = useState(isAnswered);

  useEffect(() => {
    if (isAnswered && !flipped) {
      setFlipped(true);
    }
  }, [isAnswered, flipped]);

  const height = compact ? "py-3 px-2" : "py-5 px-3";

  // Flipped card (answered) — shows team color back
  if (flipped && isAnswered) {
    const backColor =
      teamId === "red"
        ? "bg-gradient-to-br from-red-500 to-red-600 dark:from-red-600 dark:to-red-700 text-white"
        : teamId === "blue"
          ? "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white"
          : "bg-slate-400 text-white";

    return (
      <motion.div
        initial={{ rotateY: 0 }}
        animate={{ rotateY: 180 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        style={{ perspective: 800, transformStyle: "preserve-3d" }}
        className={`relative rounded-xl font-bold text-center select-none ${height} ${backColor} shadow-md`}
      >
        <div style={{ transform: "rotateY(180deg)" }}>
          <span className="text-lg opacity-90">{difficulty}</span>
          {score !== undefined && (
            <span className="block text-xs opacity-75 mt-0.5">+{score}</span>
          )}
        </div>
      </motion.div>
    );
  }

  // Active card (golden glow)
  if (isActive) {
    return (
      <div
        onClick={onClick}
        className={`relative rounded-xl font-bold text-center select-none ${height}
          bg-amber-50 dark:bg-yellow-900/30 text-amber-800 dark:text-yellow-200
          ring-2 ring-amber-400 dark:ring-yellow-400 animate-glow-pulse shadow-neon-amber
          scale-105 z-10 ${clickable ? "cursor-pointer" : ""}`}
      >
        <span className="text-lg">{difficulty}</span>
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 dark:bg-yellow-400 animate-pulse" />
      </div>
    );
  }

  // Used card (faded)
  if (isUsed) {
    return (
      <div className={`relative rounded-xl font-bold text-center select-none ${height} bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 opacity-40 grayscale`}>
        <span className="text-lg line-through">{difficulty}</span>
      </div>
    );
  }

  // Untouched card — with shimmer effect
  return (
    <div
      onClick={onClick}
      className={`question-card-untouched relative rounded-xl font-bold text-center select-none overflow-hidden ${height}
        bg-gradient-to-br from-indigo-50 via-white to-purple-50
        dark:from-slate-700/80 dark:via-slate-700/60 dark:to-indigo-900/40
        text-slate-800 dark:text-white
        border border-slate-200/80 dark:border-slate-600/50 shadow-md
        ${clickable
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:border-indigo-400 dark:hover:border-indigo-500/60 active:scale-95 transition-all duration-300"
          : "transition-all duration-300"
        }`}
    >
      <span className="relative z-10 text-lg">{difficulty}</span>
      {/* Shimmer overlay */}
      {isUntouched && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 45%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 55%, transparent 60%)",
            backgroundSize: "200% 100%",
            animation: "card-shimmer 3s ease-in-out infinite",
          }}
        />
      )}
    </div>
  );
}
