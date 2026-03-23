import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { PublicTopicRow } from "../../game/types";
import { PlayerAvatar } from "./PlayerAvatar";

interface QuestionHistoryEntry {
  questionId: string;
  teamId: string;
  score: number;
  captainId?: string;
  captainEmoji?: string;
  captainName?: string;
  jokerUsed?: boolean;
  allAnswered?: boolean;
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
    <div className="w-full space-y-10">
      {/* Topic headers */}
      <div
        className="grid gap-3"
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

      {/* Envelope grid */}
      {questionTable[0]?.questions.map((_, qi) => (
        <div
          key={qi}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${topicCount}, minmax(0, 1fr))` }}
        >
          {questionTable.map((topic, ti) => {
            const q = topic.questions[qi];
            if (!q) return <div key={ti} />;

            const history = historyMap.get(q.id);
            const isActive = q.id === activeQuestionId;
            const isAnswered = !!history;
            const clickable = !q.used && !isAnswered && !!onPick;

            return (
              <EnvelopeCard
                key={q.id}
                difficulty={q.difficulty}
                isActive={isActive}
                isAnswered={isAnswered}
                isUsed={q.used}
                clickable={clickable}
                compact={compact}
                teamId={history?.teamId}
                score={history?.score}
                captainEmoji={history?.captainEmoji}
                captainName={history?.captainName}
                jokerUsed={history?.jokerUsed}
                allAnswered={history?.allAnswered}
                onClick={() => clickable && onPick?.(ti, qi)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Color palettes ────────────────────────────────────────────────── */

function letterScoreClass(teamId?: string) {
  if (teamId === "red") return "text-red-400";
  if (teamId === "blue") return "text-blue-400";
  return "text-slate-400";
}

/* ── Dark mode hook ────────────────────────────────────────────────── */

function useDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"));
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ── Envelope Card ─────────────────────────────────────────────────── */

interface EnvelopeCardProps {
  difficulty: number;
  isActive: boolean;
  isAnswered: boolean;
  isUsed: boolean;
  clickable: boolean;
  compact: boolean;
  teamId?: string;
  score?: number;
  captainEmoji?: string;
  captainName?: string;
  jokerUsed?: boolean;
  allAnswered?: boolean;
  onClick: () => void;
}

function EnvelopeCard({
  difficulty,
  isActive,
  isAnswered,
  isUsed,
  clickable,
  compact,
  teamId,
  score,
  captainEmoji,
  captainName,
  onClick,
}: EnvelopeCardProps) {
  const maxW = compact ? "max-w-[100px]" : "max-w-[120px]";
  const [opened, setOpened] = useState(false);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      const t = setTimeout(() => setOpened(true), 150);
      wasActiveRef.current = true;
      return () => clearTimeout(t);
    }
    if (!isActive) wasActiveRef.current = false;
  }, [isActive]);

  useEffect(() => {
    if (isAnswered) setOpened(true);
  }, [isAnswered]);

  // ── Used / faded ──
  if (isUsed && !isAnswered) {
    return (
      <div className={`env-container _${teamId} mx-auto ${maxW} w-full select-none relative`}>
        <EnvelopeShell open label={difficulty}>
        </EnvelopeShell>
      </div>
    );
  }

  // ── Active — opening with shake ──
  if (isActive) {
    return (
      <div className={`env-container _${teamId} mx-auto ${maxW} w-full select-none relative z-10`}>
        <motion.div
          initial={{ scale: 1, rotate: 0 }}
          animate={{
            scale: [1, 1.03, 0.97, 1.04, 0.98, 1.06],
            rotate: [0, -2, 2.5, -1.5, 1, 0],
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 10px rgba(245, 180, 50, 0.45))" }}
        >
          <EnvelopeShell open={opened} teamId={teamId} label={difficulty} />
        </motion.div>
      </div>
    );
  }

  // ── Answered — always open ──
  if (isAnswered) {
    const scoreFailed = score === 0;
    return (
      <div className={`env-container _${teamId} mx-auto ${maxW} w-full select-none relative`}>
        
        {captainEmoji && (
          <div className="absolute z-30" style={{ top: "25%", left: "0" }}>
            <PlayerAvatar name={captainName ?? ""} emoji={captainEmoji} teamId={teamId} size="sm" />
          </div>
        )}
        
        <EnvelopeShell open teamId={teamId} label={difficulty}>
          {/* Score on letter */}
          {scoreFailed ? "---" : `+${score}`}
        </EnvelopeShell>
      </div>
    );
  }

  // ── Sealed ──
  return (
    <div
      onClick={onClick}
      className={`env-container _${teamId} mx-auto ${maxW} w-full select-none
        ${clickable
          ? "_active cursor-pointer hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300"
          : "transition-all duration-300"
        }`}
    >
      <EnvelopeShell label={difficulty} />
    </div>
  );
}

/* ── Envelope Shell ────────────────────────────────────────────────── */
/*
  Matches CodePen structure exactly:
    wrapper   = back wall (z-0)
    lid×2     = flap front/back (z-4, z-1)
    letter    = card inside (z-2)
    front×3   = V-fold panels (z-3) — left, right, bottom triangles
*/

interface EnvelopeShellProps {
  open?: boolean;
  teamId?: string;
  children?: React.ReactNode;
  label?: React.ReactNode;
}

function EnvelopeShell({ open, children, label }: EnvelopeShellProps) {
  return (
    <div className={"env-wrapper "+ (open ? "_open" : "")}>
      {/* Lid front — closed flap, visible when sealed */}
      <div className="env-lid one" />
      <div className="env-lid two" />

      {/* Letter — slides up when open */}
      <div className="env-letter">{children}</div>

      {/* Front V-fold: 3 triangles covering bottom area */}
      <div className="env-front-left"/>
      <div className="env-front-right"/>
      <div className="env-front-bottom"/>
      <div className="env-label text-base font-bold bottom-1">{label}</div>
    </div>
  );
}
