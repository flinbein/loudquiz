import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { GamePhase } from "@/types/game";
import { loadGameState, loadRoomId } from "@/persistence/sessionPersistence";
import { phaseLabel } from "./phaseLabel";

export type HomeSession =
  | { kind: "fresh" }
  | { kind: "resume"; phase: GamePhase; phaseLabel: string; roomId: string };

export function useHomeSession(): HomeSession {
  const { t } = useTranslation();

  return useMemo<HomeSession>(() => {
    const state = loadGameState();
    const roomId = loadRoomId();
    if (!state || !roomId) return { kind: "fresh" };
    if (state.phase === "lobby" || state.phase === "finale") return { kind: "fresh" };
    return {
      kind: "resume",
      phase: state.phase,
      phaseLabel: phaseLabel(state, t),
      roomId,
    };
  }, [t]);
}
