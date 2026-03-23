import type { ReactNode } from "react";
import { PlayerAvatar } from "./PlayerAvatar";
import { Sticker } from "./Sticker";
import type { StickerProps } from "./Sticker";

interface StickerWithAvatarProps {
  playerName: string;
  playerEmoji?: string;
  teamId?: string | null;
  children: ReactNode;
  color?: StickerProps["color"];
  rotation?: number;
  className?: string;
}

export function StickerWithAvatar({
  playerName,
  playerEmoji,
  teamId,
  children,
  color,
  rotation,
  className = "",
}: StickerWithAvatarProps) {
  return (
    <div className="relative inline-block overflow-visible">
      <div className="absolute -top-3 -left-3 z-20">
        <PlayerAvatar name={playerName} emoji={playerEmoji} teamId={teamId} size="md" />
      </div>
      <Sticker color={color} rotation={rotation} className={`pl-12 ${className}`}>
        {children}
      </Sticker>
    </div>
  );
}
