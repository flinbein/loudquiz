import type { Story } from "@ladle/react";
import { TaskCard } from "./TaskCard";
import { useState } from "react";

const redCaptain = { emoji: "👻", playerName: "Алексей", team: "red" as const };
const blueCaptain = { emoji: "🤖", playerName: "Мария Иванова", team: "blue" as const };

export const Default: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Животные"
      player={redCaptain}
      difficulty={200}
      questionScore="Какое животное является самым быстрым на суше?"
    />
  </div>
);

export const Hidden: Story = () => {
  const [hidden, setHidden] = useState(true)
  return <div style={{ width: 400 }}>
    <TaskCard
      topic="Животные"
      player={redCaptain}
      difficulty={200}
      questionScore="Какое животное является самым быстрым на суше?"
      hidden={hidden}
      onClick={() => setHidden(v => !v)}
    />
  </div>
};

export const NoTopic: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard player={blueCaptain} difficulty={300} questionScore="Назовите столицу Бразилии" />
  </div>
);

export const NoPlayer: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard topic="География" difficulty={100} questionScore="Какая страна самая большая по площади?" />
  </div>
);

export const LongText: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Наука"
      player={redCaptain}
      difficulty={400}
      questionScore="Объясните принцип работы ядерного реактора на тяжёлой воде и его отличия от реактора на лёгкой воде с точки зрения эффективности использования топлива"
    />
  </div>
);

export const TeamColors: Story = () => {
  const [hidden1, setHidden1] = useState(false)
  const [hidden2, setHidden2] = useState(false)
  const [hidden3, setHidden3] = useState(false)
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ width: 400 }}>
      <TaskCard hidden={hidden1} topic="Тема" player={redCaptain} difficulty={100} questionScore="Красная команда" onClick={() => setHidden1(v => !v)}/>
    </div>
    <div style={{ width: 400 }}>
      <TaskCard hidden={hidden2} topic="Тема" player={blueCaptain} difficulty={200} questionScore="Синяя команда" onClick={() => setHidden2(v => !v)}/>
    </div>
    <div style={{ width: 400 }}>
      <TaskCard hidden={hidden3} topic="Тема" player={{ emoji: "🦊", playerName: "Лиса", team: "none" }} difficulty={300} onClick={() => setHidden3(v => !v)}
                questionScore="Без команды" />
    </div>
  </div>
};

export const Difficulties: Story = () => (
  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
    {[100, 200, 300, 400].map((d) => (
      <div key={d} style={{ width: 280 }}>
        <TaskCard topic="Тема" player={redCaptain} difficulty={d} questionScore={`Вопрос за ${d} очков`} />
      </div>
    ))}
  </div>
);
