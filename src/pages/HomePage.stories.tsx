import type { Story } from "@ladle/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "./HomePage";

// Note: HomePage reads sessionStorage on mount. To demo the resume state in Ladle,
// seed storage before rendering. Each story clears first to avoid cross-story bleed.

function seed(state: object | null, roomId: string | null) {
  sessionStorage.removeItem("loud-quiz-game-state");
  sessionStorage.removeItem("loud-quiz-room-id");
  if (state) sessionStorage.setItem("loud-quiz-game-state", JSON.stringify(state));
  if (roomId) sessionStorage.setItem("loud-quiz-room-id", roomId);
}

export const Fresh: Story = () => {
  seed(null, null);
  return (
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
};

export const ResumeRound: Story = () => {
  seed(
    {
      phase: "round-active",
      settings: { mode: "manual", teamMode: "single", topicCount: 3, questionsPerTopic: 4, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [],
      teams: [],
      topics: [
        { name: "A", difficulty: 1, questions: Array.from({ length: 4 }, (_, i) => ({ text: `q${i}`, answer: "" })) },
        { name: "B", difficulty: 1, questions: Array.from({ length: 4 }, (_, i) => ({ text: `q${i}`, answer: "" })) },
        { name: "C", difficulty: 1, questions: Array.from({ length: 4 }, (_, i) => ({ text: `q${i}`, answer: "" })) },
      ],
      blitzTasks: [],
      currentRound: null,
      history: Array.from({ length: 4 }, () => ({
        type: "round",
        teamId: "red",
        captainName: "x",
        score: 0,
        jokerUsed: false,
        playerResults: [],
        difficulty: 1,
        topicIndex: 0,
        bonusTimeApplied: false,
        bonusTime: 0,
        bonusTimeMultiplier: 1,
        groups: [],
      })),
      timer: null,
    },
    "QUIZ42",
  );
  return (
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
};
