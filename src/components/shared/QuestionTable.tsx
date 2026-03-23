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
    <div className="w-full space-y-5">
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

// Beige envelope colors — always the same regardless of team
const LIGHT = {
  back: "#c49060",       // wrapper background = inner back wall
  lidFront: "#b58050",   // closed flap (slightly darker than front)
  lidBack: "#a06838",    // open flap back (darkest, visible behind)
  frontLeft: "#cca87a",  // V-fold left panel (slightly darker)
  frontRight: "#ddb892", // V-fold right panel (lighter)
  frontBottom: "#ddb892", // V-fold bottom panel (same as right)
};
const DARK = {
  back: "#6a4a2a",
  lidFront: "#5e4020",
  lidBack: "#503818",
  frontLeft: "#8a6a48",
  frontRight: "#9a7a58",
  frontBottom: "#9a7a58",
};
const FADED_LIGHT = {
  back: "#a09888",
  lidFront: "#958878",
  lidBack: "#8a7e6e",
  frontLeft: "#bab2aa",
  frontRight: "#c8c0b8",
  frontBottom: "#c8c0b8",
};
const FADED_DARK = {
  back: "#3a3a44",
  lidFront: "#333340",
  lidBack: "#2e2e38",
  frontLeft: "#444450",
  frontRight: "#4a4a54",
  frontBottom: "#4a4a54",
};

function getLetterBg(teamId?: string, dark?: boolean) {
  if (teamId === "red") return dark ? "#7f1d1d" : "#fecaca";
  if (teamId === "blue") return dark ? "#1e3a5f" : "#bfdbfe";
  return dark ? "#e2e8f0" : "#ffffff";
}

function letterScoreClass(teamId?: string) {
  if (teamId === "red") return "text-red-800 dark:text-red-200";
  if (teamId === "blue") return "text-blue-800 dark:text-blue-200";
  return "text-slate-800 dark:text-slate-200";
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
  jokerUsed,
  allAnswered,
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
      <div className={`mx-auto ${maxW} w-full select-none opacity-30`}>
        <EnvelopeShell open={false} faded>
          <CostLabel faded>{difficulty}</CostLabel>
        </EnvelopeShell>
      </div>
    );
  }

  // ── Active — opening with shake ──
  if (isActive) {
    return (
      <div className={`mx-auto ${maxW} w-full select-none relative z-10`}>
        <motion.div
          initial={{ scale: 1, rotate: 0 }}
          animate={{
            scale: [1, 1.03, 0.97, 1.04, 0.98, 1.06],
            rotate: [0, -2, 2.5, -1.5, 1, 0],
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 10px rgba(245, 180, 50, 0.45))" }}
        >
          <EnvelopeShell open={opened} teamId={teamId} showLetter>
            <CostLabel>{difficulty}</CostLabel>
          </EnvelopeShell>
        </motion.div>
      </div>
    );
  }

  // ── Answered — always open ──
  if (isAnswered) {
    const scoreFailed = score === 0;
    return (
      <div className={`mx-auto ${maxW} w-full select-none relative`}>
        <EnvelopeShell open teamId={teamId} showLetter>
          {/* Score on letter */}
          <div className="env-letter-content">
            {scoreFailed ? (
              <span className="text-red-500 dark:text-red-400 text-sm font-bold">✕</span>
            ) : (
              <span className={`text-sm font-bold ${letterScoreClass(teamId)}`}>+{score}</span>
            )}
          </div>

          {/* Captain avatar — top-left corner of letter */}
          {captainEmoji && (
            <div className="absolute z-30" style={{ top: "2%", left: "4%" }}>
              <PlayerAvatar name={captainName ?? ""} emoji={captainEmoji} teamId={teamId} size="sm" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute z-30 flex flex-col items-center gap-0.5" style={{ top: "2%", right: "12%" }}>
            {allAnswered && (
              <span className="text-yellow-500 text-[10px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" title="Все ответили">★</span>
            )}
            {jokerUsed && (
              <span className="text-[10px] drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" title="Джокер">🃏</span>
            )}
          </div>

          <CostLabel small>{difficulty}</CostLabel>
        </EnvelopeShell>
      </div>
    );
  }

  // ── Sealed ──
  return (
    <div
      onClick={onClick}
      className={`mx-auto ${maxW} w-full select-none
        ${clickable
          ? "cursor-pointer hover:-translate-y-1 hover:scale-105 active:scale-95 transition-all duration-300"
          : "transition-all duration-300"
        }`}
    >
      <EnvelopeShell open={false}>
        <CostLabel>{difficulty}</CostLabel>
      </EnvelopeShell>
    </div>
  );
}

/* ── Cost label (difficulty number on bottom half) ─────────────────── */

function CostLabel({ children, small, faded }: { children: React.ReactNode; small?: boolean; faded?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 h-[40%] flex items-center justify-center z-10 pointer-events-none">
      <span className={
        faded
          ? "text-sm font-bold text-white/50 line-through"
          : small
            ? "text-xs font-bold text-white/70 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]"
            : "text-base font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
      }>
        {children}
      </span>
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
  open: boolean;
  faded?: boolean;
  teamId?: string;
  showLetter?: boolean;
  children?: React.ReactNode;
}

function EnvelopeShell({ open, faded, teamId, showLetter, children }: EnvelopeShellProps) {
  const dark = useDark();
  const c = faded
    ? (dark ? FADED_DARK : FADED_LIGHT)
    : (dark ? DARK : LIGHT);

  return (
    <div
      className="env-wrapper"
      style={{ backgroundColor: c.back, perspective: "800px" }}
    >
      {/* Lid front — closed flap, visible when sealed */}
      <div
        className="env-lid"
        style={{
          backgroundColor: c.lidFront,
          transform: open ? "rotateX(90deg)" : "rotateX(0deg)",
          transitionDelay: open ? "0s" : "0.3s",
          zIndex: 4,
          backfaceVisibility: "hidden",
        }}
      />
      {/* Lid back — folded-back flap, visible when open (simple triangle, no 3D) */}
      {open && (
        <div
          className="env-lid-open"
          style={{ backgroundColor: c.lidBack }}
        />
      )}

      {/* Letter — slides up when open */}
      {showLetter && (
        <div
          className="env-letter"
          style={{
            backgroundColor: getLetterBg(teamId, dark),
            transform: open ? "translateY(-40%)" : "translateY(0)",
            transitionDelay: open ? "0.3s" : "0s",
          }}
        />
      )}

      {/* Front V-fold: 3 triangles covering bottom area */}
      <div className="env-front-left" style={{ backgroundColor: c.frontLeft }} />
      <div className="env-front-right" style={{ backgroundColor: c.frontRight }} />
      <div className="env-front-bottom" style={{ backgroundColor: c.frontBottom }} />

      {children}
    </div>
  );
}
