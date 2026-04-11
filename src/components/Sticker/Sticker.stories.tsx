import type { Story } from "@ladle/react";
import { Sticker } from "./Sticker";
import { useState } from "react";

const redPlayer = { emoji: "👻", name: "Алексей", team: "red" as const };
const bluePlayer = { emoji: "🤖", name: "Мария", team: "blue" as const };

export const CorrectAnswer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker player={redPlayer} answerText="Гепард" stampText="+200" stampColor="green" />
  </div>
);

export const ShowHide: Story = () => {
  const [hidden, setHidden] = useState(false);
  return (
    <div style={{ width: 220 }}>
      <Sticker
        player={redPlayer}
        answerHidden={hidden}
        onClickAvatar={() => setHidden(v => !v)}
        answerText="Гепард"
        stampText="+200"
        stampColor="green"
      />
    </div>
  )
};

export const WrongAnswer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker player={bluePlayer} answerText="Лев" stampText="Неверно" stampColor="red" />
  </div>
);

export const WithAIComment: Story = () => (
  <div style={{ width: 250 }}>
    <Sticker
      player={redPlayer}
      answerText="Сокол-сапсан"
      aiComment="Технически самая быстрая птица, но вопрос был о наземных животных"
      stampText="Неправильно"
      stampColor="red"
    />
  </div>
);

const stamps = [
  {stampText: undefined, stampColor: undefined},
  {stampText: "+200", stampColor: "green"},
  {stampText: undefined, stampColor: undefined},
  {stampText: "Плохо", stampColor: "red"},
] as const;
export const ChangeStamp: Story = () => {
  const [stampId, setStampId] = useState(0);
  return <div style={{ width: 220 }}>
    <Sticker
      player={redPlayer}
      onClickSticker={() => setStampId(v => (v+1) % stamps.length)}
      answerText="Жду проверки..."
      {...stamps[stampId]}
    />
  </div>
};

export const NoPlayer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker answerText="Анонимный ответ" stampText="+100" stampColor="green" />
  </div>
);

export const LongAnswer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker
      player={bluePlayer}
      answerText="Это очень длинный ответ который должен переноситься на несколько строк"
      stampText="+300"
      stampColor="green"
    />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
    <div style={{ width: 200 }}>
      <Sticker player={redPlayer} answerText="Красная команда" stampText="+100" stampColor="green" />
    </div>
    <div style={{ width: 200 }}>
      <Sticker player={bluePlayer} answerText="Синяя команда" stampText="Нет" stampColor="red" />
    </div>
    <div style={{ width: 200 }}>
      <Sticker
        player={{ emoji: "🦊", name: "Лиса", team: "none" }}
        answerText="Без команды"
        stampText="+50"
        stampColor="green"
      />
    </div>
  </div>
);
