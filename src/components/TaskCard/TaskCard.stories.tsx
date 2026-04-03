import type { Story } from "@ladle/react";
import { TaskCard } from "./TaskCard";

const redCaptain = { emoji: "👻", playerName: "Алексей", team: "red" as const };
const blueCaptain = { emoji: "🤖", playerName: "Мария Иванова", team: "blue" as const };

export const Default: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Животные"
      player={redCaptain}
      difficulty={200}
      questionText="Какое животное является самым быстрым на суше?"
    />
  </div>
);

export const Hidden: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Животные"
      player={redCaptain}
      difficulty={200}
      questionText="Какое животное является самым быстрым на суше?"
      hidden
    />
  </div>
);

export const NoTopic: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard player={blueCaptain} difficulty={300} questionText="Назовите столицу Бразилии" />
  </div>
);

export const NoPlayer: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard topic="География" difficulty={100} questionText="Какая страна самая большая по площади?" />
  </div>
);

export const LongText: Story = () => (
  <div style={{ width: 400 }}>
    <TaskCard
      topic="Наука"
      player={redCaptain}
      difficulty={400}
      questionText="Объясните принцип работы ядерного реактора на тяжёлой воде и его отличия от реактора на лёгкой воде с точки зрения эффективности использования топлива"
    />
  </div>
);

export const TeamColors: Story = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <div style={{ width: 400 }}>
      <TaskCard topic="Тема" player={redCaptain} difficulty={100} questionText="Красная команда" />
    </div>
    <div style={{ width: 400 }}>
      <TaskCard topic="Тема" player={blueCaptain} difficulty={200} questionText="Синяя команда" />
    </div>
    <div style={{ width: 400 }}>
      <TaskCard topic="Тема" player={{ emoji: "🦊", playerName: "Лиса", team: "beige" }} difficulty={300} questionText="Без команды" />
    </div>
  </div>
);

export const Difficulties: Story = () => (
  <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
    {[100, 200, 300, 400].map((d) => (
      <div key={d} style={{ width: 280 }}>
        <TaskCard topic="Тема" player={redCaptain} difficulty={d} questionText={`Вопрос за ${d} очков`} />
      </div>
    ))}
  </div>
);
