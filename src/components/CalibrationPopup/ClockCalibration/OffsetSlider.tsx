export interface OffsetSliderProps {
  /** Current tempOffset in ms, within [-200, 200] */
  value: number;
  onChange: (ms: number) => void;
  disabled?: boolean;
}

const MIN = -200;
const MAX = 200;
const SNAP = 3;

/**
 * Slider for manual clock offset nudge. Range ±200 ms, step 1 ms,
 * snaps to 0 within ±3 ms of center.
 */
export function OffsetSlider({ value, onChange, disabled = false }: OffsetSliderProps) {
  return (
    <input
      type="range"
      min={MIN}
      max={MAX}
      step={1}
      value={value}
      disabled={disabled}
      aria-label="Offset nudge"
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      aria-valuenow={value}
      onChange={(e) => {
        const raw = Number(e.target.value);
        onChange(Math.abs(raw) <= SNAP ? 0 : raw);
      }}
      style={{ width: "100%" }}
    />
  );
}
