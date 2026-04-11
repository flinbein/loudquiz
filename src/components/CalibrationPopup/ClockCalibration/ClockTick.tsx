import { useClockTick } from "@/hooks/useClockTick";

export interface ClockTickProps {
  enabled: boolean;
  offset: number;
  tempOffset: number;
  volume: number;
}

/**
 * Thin wrapper rendering nothing, just drives `useClockTick`. Lives as a
 * component so `CalibrationPopup` composition stays JSX-only.
 */
export function ClockTick(props: ClockTickProps) {
  useClockTick(props);
  return null;
}
