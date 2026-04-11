import { useEffect, useRef, useState } from "react";

export interface UseSecondPulseOptions {
  enabled: boolean;
  /** `hostNow - localNow` in ms */
  offset: number;
  /** Manual nudge, ms */
  tempOffset: number;
}

export interface UseSecondPulseResult {
  /** Virtual clock time in ms: `performance.now() + offset + tempOffset` */
  timeMs: number;
  /** True within `PULSE_DURATION_MS` after each whole-second boundary */
  pulsing: boolean;
}

const PULSE_DURATION_MS = 80;

/**
 * Drives the ClockDisplay: ticks on requestAnimationFrame, reports the
 * current virtual clock and whether we are inside an 80ms window right
 * after a whole-second boundary.
 *
 * Pure: no store access, all inputs are props.
 */
export function useSecondPulse(
  options: UseSecondPulseOptions,
): UseSecondPulseResult {
  const { enabled, offset, tempOffset } = options;
  const [state, setState] = useState<UseSecondPulseResult>({
    timeMs: 0,
    pulsing: false,
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ timeMs: 0, pulsing: false });
      return;
    }

    function tick() {
      const virtual = performance.now() + offset + tempOffset;
      const msInSecond = ((virtual % 1000) + 1000) % 1000;
      const pulsing = msInSecond < PULSE_DURATION_MS;
      setState({ timeMs: virtual, pulsing });
      rafRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, offset, tempOffset]);

  return state;
}
