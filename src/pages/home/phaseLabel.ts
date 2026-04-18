import type { TFunction } from "i18next";
import type { GameState } from "@/types/game";

export function phaseLabel(state: GameState, t: TFunction): string {
  const { phase } = state;

  if (phase.startsWith("topics-")) {
    return t("home.resumePhase.topics");
  }

  if (phase.startsWith("round-")) {
    const current = state.history.filter((r) => r.type === "round").length + 1;
    const total = state.topics.reduce((n, topic) => n + topic.questions.length, 0);
    return t("home.resumePhase.round", { current, total });
  }

  if (phase.startsWith("blitz-")) {
    const current = state.history.filter((r) => r.type === "blitz").length + 1;
    const total = state.blitzTasks.length;
    return t("home.resumePhase.blitz", { current, total });
  }

  return "";
}
