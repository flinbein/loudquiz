import { useGameStore } from "@/store/gameStore";
import { useClockSyncStore } from "@/store/clockSyncStore";

export function useLocalTimer(): { startedAt: number; duration: number } | null {
  const timer = useGameStore((s) => s.timer);
  const offset = useClockSyncStore((s) => s.offset);
  if (!timer) return null;
  return { startedAt: timer.startedAt - offset, duration: timer.duration };
}
