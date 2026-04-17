import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlayerFinale } from "./PlayerFinale";
import { useGameStore } from "@/store/gameStore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("PlayerFinale", () => {
  it("renders game over and score", () => {
    useGameStore.setState({
      phase: "finale",
      settings: { mode: "manual", teamMode: "single", topicCount: 1, questionsPerTopic: 1, blitzRoundsPerTeam: 0, pastQuestions: [] },
      teams: [{ id: "none", score: 500, jokerUsed: false }],
      players: [],
      topics: [],
      history: [],
      currentRound: null,
      timer: null,
    });

    const mockSendAction = vi.fn();
    render(<PlayerFinale sendAction={mockSendAction} />);
    expect(screen.getByText("finale.gameOver")).toBeInTheDocument();
  });
});
