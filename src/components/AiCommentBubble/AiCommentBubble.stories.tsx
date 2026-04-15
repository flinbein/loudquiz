import type { Story } from "@ladle/react";
import { useState } from "react";
import { AiCommentBubble } from "./AiCommentBubble";

const SHORT = "Красные вырвались вперёд — неужели подглядывали в Википедию?";
const LONG = "Синие сегодня блистают эрудицией, а красные явно надеются на удачу. Впрочем, пара правильных ответов всё же проскользнула — случайность или озарение? Посмотрим в следующем раунде.";
const ALT = "Никто не угадал столицу Перу. Даже я немного разочарован.";

export const Short: Story = () => (
  <div style={{ padding: 40, fontSize: 16 }}>
    <AiCommentBubble text={SHORT} />
  </div>
);

export const Long: Story = () => (
  <div style={{ padding: 40, fontSize: 16 }}>
    <AiCommentBubble text={LONG} />
  </div>
);

export const ChangeText: Story = () => {
  const [text, setText] = useState(SHORT);
  return (
    <div style={{ padding: 40, fontSize: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <button onClick={() => setText((t) => (t === SHORT ? ALT : SHORT))}>
        Toggle text
      </button>
      <AiCommentBubble text={text} />
    </div>
  );
};
