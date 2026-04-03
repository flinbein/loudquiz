import type { Story } from "@ladle/react";
import type { ComponentProps } from "react";
import type { Sticker } from "@/components/Sticker/Sticker";
import { StickerStack } from "./StickerStack";

const makeSticker = (
  name: string,
  emoji: string,
  answer: string,
  team: "red" | "blue" | "beige" = "red",
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
        makeSticker("Мария", "🤖", "Гепард"),
      ]}
    />
  </div>
);

export const FiveStickers: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack
      stickers={[
        makeSticker("Алексей", "👻", "Гепард"),
        makeSticker("Мария", "🤖", "Гепард"),
        makeSticker("Иван", "🦊", "Гепард"),
        makeSticker("Ольга", "👽", "Гепард"),
        makeSticker("Пётр", "🐙", "Гепард"),
      ]}
      onSplit={() => alert("Split!")}
    />
  </div>
);

export const MixedTeams: Story = () => (
  <div style={{ width: 220 }}>
    <StickerStack
      stickers={[
        makeSticker("Красный", "👻", "Ответ", "red"),
        makeSticker("Синий", "🤖", "Ответ", "blue"),
        makeSticker("Бежевый", "🦊", "Ответ", "beige"),
      ]}
    />
  </div>
);
