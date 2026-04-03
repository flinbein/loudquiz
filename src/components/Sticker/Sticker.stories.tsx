import type { Story } from "@ladle/react";
import { Sticker } from "./Sticker";

const redPlayer = { emoji: "👻", playerName: "Алексей", team: "red" as const };
const bluePlayer = { emoji: "🤖", playerName: "Мария", team: "blue" as const };

export const CorrectAnswer: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker player={redPlayer} answerText="Гепард" stampText="+200" stampColor="green" />
  </div>
);

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

export const NoStamp: Story = () => (
  <div style={{ width: 220 }}>
    <Sticker player={redPlayer} answerText="Жду проверки..." />
  </div>
);

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
        player={{ emoji: "🦊", playerName: "Лиса", team: "beige" }}
        answerText="Без команды"
        stampText="+50"
        stampColor="green"
      />
    </div>
  </div>
);
