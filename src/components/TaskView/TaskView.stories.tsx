import type { Story } from "@ladle/react";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "./TaskView";

function makeQuestion(difficulty: number, open = false, active = false) {
  return {
    open,
    active,
    jokerUsed: false,
    difficulty,
    totalScore: open ? 1994 : undefined,
    paperColor: "red" as const,
  };
}

const topics: TaskViewTopic[] = [
  {
    name: "Животные",
    questions: [
      makeQuestion(100, true),
      makeQuestion(200),
      makeQuestion(300),
      makeQuestion(400),
    ],
  },
  {
    name: "География",
    questions: [
      makeQuestion(100),
      makeQuestion(200, true),
      makeQuestion(300, true, true),
      makeQuestion(400),
    ],
  },
  {
    name: "Наука",
    questions: [
      makeQuestion(100),
      makeQuestion(200),
      makeQuestion(300),
      makeQuestion(400, true),
    ],
  },
];

const blitz: TaskViewBlitz[] = [
  { active: false, team: "red", score: 2200 },
  { active: false, team: "blue", score: 0 },
  { active: false },
];

const blitzLarge: TaskViewBlitz[] = [
  { active: false, team: "red", score: 2200 },
  { active: false, team: "blue", score: 400 },
  { active: false, team: "red", score: 100 },
  { active: false, team: "blue", score: 200 },
  { active: false, team: "red", score: 244 },
  { active: true, team: "blue" },
  { active: false },
  { active: false },
  { active: false },
  { active: false },
];

export const FullGrid: Story = () => (
  <div style={{ width: 400 }}>
    <TaskView
      topics={topics}
      blitzRounds={blitz}
      onSelectQuestion={(t, q) => console.log("question", t, q)}
      onSelectBlitz={(b) => console.log("blitz", b)}
    />
  </div>
);

export const Sizes: Story = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
    <div style={{ width: 600, height: 600, display: "flex", border: "1px dashed #888" }}>
      <TaskView topics={topics} blitzRounds={blitz} />
    </div>
    <div style={{ width: 400, height: 400, display: "flex", border: "1px dashed #888" }}>
      <TaskView topics={topics} blitzRounds={blitz} />
    </div>
    <div style={{ width: 300, height: 300, display: "flex", border: "1px dashed #888" }}>
      <TaskView topics={topics} blitzRounds={blitz} />
    </div>
  </div>
);

export const HeightConstrained: Story = () => (
  <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
    <div style={{ width: 400, height: 800, display: "flex", border: "1px dashed #888" }}>
      <TaskView topics={topics} blitzRounds={blitzLarge} />
    </div>
    <div style={{ width: 400, height: 500, display: "flex", border: "1px dashed #888" }}>
      <TaskView topics={topics} blitzRounds={blitzLarge} />
    </div>
    <div style={{ width: 400, height: 300, display: "flex", border: "1px dashed #888" }}>
      <TaskView topics={topics} blitzRounds={blitzLarge} />
    </div>
  </div>
);

export const ActiveBlitz: Story = () => (
  <div style={{ width: 400 }}>
    <TaskView
      topics={topics}
      blitzRounds={[
        { active: false, team: "red", score: 2200 },
        { active: true, team: "blue", score: 0 },
        { active: false },
      ]}
    />
  </div>
);

export const QuestionsOnly: Story = () => (
  <div style={{ width: 400, height: 400, display: "flex", border: "1px dashed #888" }}>
    <TaskView topics={topics} blitzRounds={[]} />
  </div>
);

export const BlitzOnly: Story = () => (
  <div style={{ width: 400 }}>
    <TaskView
      topics={[]}
      blitzRounds={[
        { active: false, team: "red", score: 2200 },
        { active: true, team: "blue", score: 0 },
        { active: false, team: "red", score: 2400 },
        { active: false },
      ]}
    />
  </div>
);

export const BlitzLarge: Story = () => (
  <div style={{ width: 400 }}>
    <TaskView
      topics={[]}
      blitzRounds={[
        { active: false, team: "red", score: 2200 },
        { active: true, team: "blue", score: 0 },
        { active: false, team: "red", score: 2400 },
        { active: false, team: "red", score: 2200 },
        { active: true, team: "blue", score: 0 },
        { active: false, team: "red", score: 2400 },
        { active: false, team: "red", score: 2200 },
        { active: true, team: "blue", score: 0 },
        { active: false, team: "red", score: 2400 },
        { active: false },
      ]}
    />
  </div>
);

export const WithPlayerAndJoker: Story = () => {
  const player = { emoji: "👻", name: "Алексей", team: "red" as const };
  const topicsWithPlayer: TaskViewTopic[] = [
    {
      name: "Тема",
      questions: [
        { ...makeQuestion(100, true), player, jokerUsed: true, paperColor: "red" },
        makeQuestion(200),
      ],
    },
  ];
  return (
    <div style={{ width: 200 }}>
      <TaskView topics={topicsWithPlayer} blitzRounds={[]} />
    </div>
  );
};

export const Empty: Story = () => (
  <div style={{ width: 400, height: 300, display: "flex", border: "1px dashed #888" }}>
    <TaskView topics={[]} blitzRounds={[]} />
  </div>
);
