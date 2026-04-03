import type { Story } from "@ladle/react";
import { TaskView, type TaskViewTopic, type TaskViewBlitz } from "./TaskView";

function makeQuestion(label: string, open = false, active = false) {
  return {
    open,
    active,
    jokerUsed: false,
    label,
    paperText: open ? `Ответ на вопрос за ${label}` : undefined,
    paperColor: "red" as const,
  };
}

const topics: TaskViewTopic[] = [
  {
    name: "Животные",
    questions: [
      makeQuestion("100", true),
      makeQuestion("200"),
      makeQuestion("300"),
      makeQuestion("400"),
    ],
  },
  {
    name: "География",
    questions: [
      makeQuestion("100"),
      makeQuestion("200", true),
      makeQuestion("300", false, true),
      makeQuestion("400"),
    ],
  },
  {
    name: "Наука",
    questions: [
      makeQuestion("100"),
      makeQuestion("200"),
      makeQuestion("300"),
      makeQuestion("400", true),
    ],
  },
];

const blitz: TaskViewBlitz[] = [
  { active: false, teamColor: "red", text: "200" },
  { active: false, teamColor: "blue", text: "?" },
  { active: false, text: "?" },
];

export const FullGrid: Story = () => (
  <div style={{ width: 600 }}>
    <TaskView
      topics={topics}
      blitzRounds={blitz}
      onSelectQuestion={(t, q) => console.log("question", t, q)}
      onSelectBlitz={(b) => console.log("blitz", b)}
    />
  </div>
);

export const ActiveBlitz: Story = () => (
  <div style={{ width: 600 }}>
    <TaskView
      topics={topics}
      blitzRounds={[
        { active: false, teamColor: "red", text: "200" },
        { active: true, teamColor: "blue", text: "?" },
        { active: false, text: "?" },
      ]}
    />
  </div>
);

export const QuestionsOnly: Story = () => (
  <div style={{ width: 600 }}>
    <TaskView topics={topics} blitzRounds={[]} />
  </div>
);

export const BlitzOnly: Story = () => (
  <div style={{ width: 400 }}>
    <TaskView
      topics={[]}
      blitzRounds={[
        { active: false, teamColor: "red", text: "200" },
        { active: true, teamColor: "blue", text: "?" },
        { active: false, teamColor: "red", text: "400" },
        { active: false, text: "?" },
      ]}
    />
  </div>
);

export const WithPlayerAndJoker: Story = () => {
  const player = { emoji: "👻", playerName: "Алексей", team: "red" as const };
  const topicsWithPlayer: TaskViewTopic[] = [
    {
      name: "Тема",
      questions: [
        { ...makeQuestion("100", true), player, jokerUsed: true, paperColor: "red" },
        makeQuestion("200"),
      ],
    },
  ];
  return (
    <div style={{ width: 300 }}>
      <TaskView topics={topicsWithPlayer} blitzRounds={[]} />
    </div>
  );
};

export const Empty: Story = () => (
  <div style={{ width: 400 }}>
    <TaskView topics={[]} blitzRounds={[]} />
  </div>
);
