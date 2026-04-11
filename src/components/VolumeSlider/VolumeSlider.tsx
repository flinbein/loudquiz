import styles from "./VolumeSlider.module.css";

export interface VolumeSliderProps {
  /** 0..1 */
  value: number;
  /** Receives 0..1 */
  onChange: (value: number) => void;
  disabled?: boolean;
  label: string;
}

export function VolumeSlider({
  value,
  onChange,
  disabled = false,
  label,
}: VolumeSliderProps) {
  const percent = Math.round(value * 100);
  return (
    <input
      type="range"
      min={0}
      max={100}
      step={1}
      value={percent}
      aria-label={label}
      disabled={disabled}
      className={styles.slider}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
    />
  );
}
