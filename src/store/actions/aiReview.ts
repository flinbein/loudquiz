import { useGameStore } from "@/store/gameStore";
import type { AnswerEvaluation, ReviewResult } from "@/types/game";

function updateReviewResult(mutator: (rr: ReviewResult) => ReviewResult): void {
  const s = useGameStore.getState();
  if (!s.currentRound?.reviewResult) return;
  useGameStore.getState().setState({
    currentRound: {
      ...s.currentRound,
      reviewResult: mutator(s.currentRound.reviewResult),
    },
  });
}

export function beginAiReview(): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  if (s.settings.mode !== "ai") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "idle") return;
  updateReviewResult((rr) => ({ ...rr, aiStatus: "loading", aiError: undefined }));
}

export function onAiReviewSuccess(result: {
  evaluations: AnswerEvaluation[];
  groups: string[][];
}): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "loading") return;
  updateReviewResult((rr) => ({
    ...rr,
    aiStatus: "done",
    aiError: undefined,
    evaluations: result.evaluations,
    groups: result.groups,
  }));
}

export function onAiReviewError(message: string): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "loading") return;
  updateReviewResult((rr) => ({ ...rr, aiStatus: "error", aiError: message }));
}

export function retryAiReview(): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "error") return;
  updateReviewResult((rr) => ({ ...rr, aiStatus: "loading", aiError: undefined }));
}

export function fallbackReviewToManual(): void {
  const s = useGameStore.getState();
  if (s.phase !== "round-review") return;
  const rr = s.currentRound?.reviewResult;
  if (!rr || rr.aiStatus !== "error") return;
  updateReviewResult((rr) => ({ ...rr, aiStatus: "idle", aiError: undefined }));
}
