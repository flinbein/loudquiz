import type { ReactNode } from "react";

interface StickerProps {
  children: ReactNode;
  color?: "yellow" | "red" | "blue" | "green" | "pink" | "white";
  rotation?: number;
  className?: string;
}

const colorMap = {
  yellow: { bg: "bg-yellow-200", tape: "rgba(253,230,138,0.7)" },
  red:    { bg: "bg-red-200",       tape: "rgba(254,202,202,0.7)" },
  blue:   { bg: "bg-blue-200",     tape: "rgba(191,219,254,0.7)" },
  green:  { bg: "bg-green-200",   tape: "rgba(187,247,208,0.7)" },
  pink:   { bg: "bg-pink-200",     tape: "rgba(251,207,232,0.7)" },
  white:  { bg: "bg-slate-100",       tape: "rgba(241,245,249,0.7)" },
};

export function Sticker({
  children,
  color = "yellow",
  rotation = 0,
  className = "",
}: StickerProps) {
  const colors = colorMap[color];

  return (
    <div
      className={`relative ${colors.bg} rounded-sm p-6 pt-6 sticker-texture sticker-corner shadow-md ${className}`}
      style={{
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)",
      }}
    >
      {/* Tape strip */}
      <div
        className="absolute -top-1 left-3 right-3 h-3 rounded-sm"
        style={{
          background: `linear-gradient(180deg, transparent, ${colors.tape} 8%, ${colors.tape} 92%, transparent)`,
          opacity: 0.6,
        }}
      />
      {/* Content */}
      <div className="relative z-10 text-sm text-slate-800">{children}</div>
    </div>
  );
}

export type { StickerProps };
