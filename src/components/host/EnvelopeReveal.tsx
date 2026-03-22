import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface EnvelopeRevealProps {
  topicName: string;
  difficulty: number;
  onComplete?: () => void;
}

export function EnvelopeReveal({
  topicName,
  difficulty,
  onComplete,
}: EnvelopeRevealProps) {
  const [phase, setPhase] = useState<"envelope" | "open" | "card" | "done">("envelope");

  useEffect(() => {
    // Check reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setPhase("done");
      onComplete?.();
      return;
    }

    const t1 = setTimeout(() => setPhase("open"), 600);
    const t2 = setTimeout(() => setPhase("card"), 1200);
    const t3 = setTimeout(() => {
      setPhase("done");
      onComplete?.();
    }, 7200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative w-72 h-48">
          {/* Envelope body */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-800 dark:to-amber-900 rounded-xl shadow-2xl border-2 border-amber-300 dark:border-amber-600 overflow-hidden"
            initial={{ y: 60, scale: 0.8, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Seal */}
            {phase === "envelope" && (
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-red-600 dark:bg-red-700 flex items-center justify-center shadow-lg"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <span className="text-white font-bold text-lg">?</span>
              </motion.div>
            )}
          </motion.div>

          {/* Flap */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-24 origin-top"
            style={{ perspective: "400px" }}
          >
            <motion.div
              className="w-full h-full bg-gradient-to-b from-amber-200 to-amber-100 dark:from-amber-700 dark:to-amber-800 rounded-t-xl border-2 border-b-0 border-amber-300 dark:border-amber-600"
              style={{
                transformStyle: "preserve-3d",
                clipPath: "polygon(0 0, 50% 100%, 100% 0)",
              }}
              animate={
                phase === "envelope"
                  ? { rotateX: 0 }
                  : { rotateX: -180 }
              }
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Card sliding out */}
          {(phase === "card") && (
            <motion.div
              className="absolute inset-x-4 top-2 bottom-4 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 flex flex-col items-center justify-center gap-2"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -80, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Тема</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white text-center">{topicName}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-amber-600 dark:text-yellow-400">{difficulty}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">очков</span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
