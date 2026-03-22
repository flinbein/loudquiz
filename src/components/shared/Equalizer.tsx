interface EqualizerProps {
  active?: boolean;
  bars?: number;
  className?: string;
}

const barDelays = [0, 0.15, 0.3, 0.1, 0.25, 0.05, 0.2];
const barDurations = [0.8, 1.1, 0.9, 1.3, 1.0, 1.2, 0.85];

export function Equalizer({
  active = true,
  bars = 7,
  className = "",
}: EqualizerProps) {
  return (
    <div
      className={`flex items-end justify-center gap-[3px] ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-current transition-all"
          style={
            active
              ? {
                  animation: `eq-bounce ${barDurations[i % barDurations.length]}s ease-in-out ${barDelays[i % barDelays.length]}s infinite alternate`,
                }
              : {
                  height: "50%",
                }
          }
        />
      ))}
      <style>{`
        @keyframes eq-bounce {
          0% { height: 15%; }
          100% { height: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="eq-bounce"] { animation: none !important; height: 50% !important; }
        }
      `}</style>
    </div>
  );
}
