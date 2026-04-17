import type { Story } from "@ladle/react";
import { TaskCard } from "./TaskCard";
import { useState } from "react";

const redCaptain = { emoji: "👻", name: "Алексей", team: "red" as const };
const blueCaptain = { emoji: "🤖", name: "Мария Иванова", team: "blue" as const };

export const Default: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Животные"
      player={redCaptain}
      bottomText={200}
    >Какое животное является самым быстрым на суше? </TaskCard>
  </div>
);

export const Hidden: Story = () => {
  const [hidden, setHidden] = useState(true)
  return <div style={{ width: 400, marginLeft: 400 }}>
    <TaskCard
      topic="Животные"
      player={redCaptain}
      bottomText={200}
      hidden={hidden}
      onClick={() => setHidden(v => !v)}
    >Какое животное является самым быстрым на суше? </TaskCard>
  </div>
};

export const NoTopic: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard player={blueCaptain} bottomText={300}>
      Назовите столицу Бразилии
    </TaskCard>
  </div>
);

export const NoPlayer: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard topic="География" bottomText={100}>
      Какая страна самая большая по площади?
    </TaskCard>
  </div>
);

export const LongText: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Наука"
      player={redCaptain}
      bottomText={400}
    >
      Объясните принцип работы ядерного реактора на тяжёлой воде
      и его отличия от реактора на лёгкой воде
      с точки зрения эффективности использования топлива
    </TaskCard>
  </div>
);

export const TeamColors: Story = () => {
  const [hidden1, setHidden1] = useState(false)
  const [hidden2, setHidden2] = useState(false)
  const [hidden3, setHidden3] = useState(false)
  return <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ width: 400 }}>
      <TaskCard hidden={hidden1} topic="Тема" player={redCaptain} bottomText={100} onClick={() => setHidden1(v => !v)}>
        Красная команда
      </TaskCard>
    </div>
    <div style={{ width: 400 }}>
      <TaskCard hidden={hidden2} topic="Тема" player={blueCaptain} bottomText={200} onClick={() => setHidden2(v => !v)}>
        Синяя команда
      </TaskCard>
    </div>
    <div style={{ width: 400 }}>
      <TaskCard
        hidden={hidden3}
        topic="Тема"
        player={{ emoji: "🦊", name: "Лиса", team: "none" }}
        bottomText={300} onClick={() => setHidden3(v => !v)}
      >
        Без команды
      </TaskCard>
    </div>
  </div>
};

export const Difficulties: Story = () => (
  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
    {[100, 200, 300, 400].map((d) => (
      <div key={d} style={{ width: 280 }}>
        <TaskCard topic="Тема" player={redCaptain} bottomText={d} >
          Вопрос за {d} очков
        </TaskCard>
      </div>
    ))}
  </div>
);
