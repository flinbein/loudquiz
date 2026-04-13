import { useState } from "react";
import type { Story } from "@ladle/react";
import type { ComponentProps } from "react";
import type { Sticker, StickerProps } from "@/components/Sticker/Sticker";
import { StickerStack } from "./StickerStack";

const makeSticker = (
  name: string,
  emoji: string,
  answer: string,
  team: "red" | "blue" | "none" = "red",
): ComponentProps<typeof Sticker> => ({
  player: { emoji, name: name, team },
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

export const MixedTeams: Story = () => {
  const [stickers, setStickers] = useState(() => [
    makeSticker("Красный", "👻", "Ответ", "red"),
    makeSticker("Синий", "🤖", "Более развернутый ответ о том же", "blue"),
    makeSticker("Без команды", "🦊", "Другой ответ", "none"),
  ])
  function clickSticker(index: number) {
    setStickers(stickers => stickers.map((sticker, i) => i !== index ? sticker : ({
      ...sticker,
      answerHidden: !sticker.answerHidden
    })))
  }
  return <div style={{ width: 350, padding: 50 }}>
    <StickerStack stickers={stickers} onClickSticker={clickSticker} />
  </div>
};

const DND_GROUPS = [
  [{ player: { emoji: "🐦", name: "Alice", team: "red" }, answerText: "Кошка" } as StickerProps],
  [{ player: { emoji: "🐬", name: "Bob", team: "blue" }, answerText: "Кот" } as StickerProps] ,
  [{ player: { emoji: "🐢", name: "Carol", team: "none" }, answerText: "Собака"} as StickerProps] ,
]
export const DragAndDrop: Story = () => {
  const [groups, setGroups] = useState(DND_GROUPS);

  function handleDrop(targetIdx: number, sourceData: string) {
    const sourceIdx = groups.findIndex((_, i) => String(i) === sourceData);
    if (sourceIdx === -1 || sourceIdx === targetIdx) return;
    setGroups((prev) => {
      const merged = [...(prev[targetIdx] ?? []), ...(prev[sourceIdx] ?? [])];
      return prev.filter((_, i) => i !== sourceIdx && i !== targetIdx).concat([merged]);
    });
  }

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {groups.map((group, i) => (
        <div key={group.map(g => g.player?.name).join("\0")} style={{width: 200}}>
          <StickerStack
            stickers={group}
            draggable
            onClickBadge={() => setGroups(DND_GROUPS)}
            dragData={String(i)}
            onDrop={(data) => handleDrop(i, data)}
          />
        </div>
      ))}
    </div>
  );
};
