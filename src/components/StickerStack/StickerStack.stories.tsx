import type { Story } from "@ladle/react";
import type { ComponentProps } from "react";
import type { Sticker } from "@/components/Sticker/Sticker";
import { StickerStack } from "./StickerStack";

const makeSticker = (
  name: string,
  emoji: string,
  answer: string,
  team: "red" | "blue" | undefined = "red",
): ComponentProps<typeof Sticker> => ({
  player: { emoji, playerName: name, team },
  answerText: answer,
  stampText: "+100",
  stampColor: "green",
});

export const Single: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack stickers={[makeSticker("Алексей", "👻", "Гепард")]} />
  </div>
);

export const TwoStickers: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack
      stickers={[
        makeSticker("Алексей", "👻", "Гепард"),
        makeSticker("Мария", "🤖", "Гепардик"),
      ]}
    />
  </div>
);

export const FiveStickers: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack
      stickers={[
        makeSticker("Алексей", "👻", "Гепард"),
        makeSticker("Мария", "🤖", "Гепардик"),
        makeSticker("Иван", "🦊", "Герпад"),
        makeSticker("Ольга", "👽", "Геопард"),
        makeSticker("Пётр", "🐙", "Гипард"),
      ]}
      onClickBadge={(n) => alert(`Click on Badge, index:${n}`)}
    />
  </div>
);

export const MixedTeams: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack
      stickers={[
        makeSticker("Красный", "👻", "Ответ", "red"),
        makeSticker("Синий", "🤖", "Более развернутый ответ о том же", "blue"),
        makeSticker("Без команды", "🦊", "Другой ответ", undefined),
      ]}
    />
  </div>
);
