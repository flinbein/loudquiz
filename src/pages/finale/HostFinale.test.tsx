import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HostFinale } from "./HostFinale";
import { useGameStore } from "@/store/gameStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, string>) => opts?.team ? `${key} ${opts.team}` : key }),
}));

describe("HostFinale", () => {
  it("renders scoreboard and nominations", () => {
    useGameStore.setState({
      phase: "finale",
      settings: { mode: "manual", teamMode: "dual", topicCount: 1, questionsPerTopic: 1, blitzRoundsPerTeam: 0, pastQuestions: [] },
      players: [
        { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
        { name: "Bob", emoji: "👹", team: "blue", online: true, ready: true },
      ],
      teams: [
        { id: "red", score: 200, jokerUsed: false },
        { id: "blue", score: 150, jokerUsed: false },
      ],
      topics: [{ name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: ["a"] }] }],
      history: [{
        type: "round",
        teamId: "red",
        captainName: "Alice",
        questionIndex: 0,
        score: 200,
        jokerUsed: false,
        playerResults: [
          { playerName: "Alice", answerText: "a", correct: true, answerTime: 3000, groupIndex: 0 },
        ],
        difficulty: 100,
        topicIndex: 0,
        bonusTimeApplied: false,
        bonusTime: 0,
        bonusTimeMultiplier: 1,
        groups: [["Alice"]],
      }],
      currentRound: null,
      timer: null,
    });

    render(<HostFinale />);
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });
});
