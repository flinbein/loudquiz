import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useGameStore } from "@/store/gameStore";
import { TaskCardBlock } from "./TaskCardBlock";
import type { GameState } from "@/types/game";

function setupState(overrides?: Partial<GameState>) {
  useGameStore.setState({
    phase: "round-active",
    settings: { mode: "manual", teamMode: "dual", topicCount: 2, questionsPerTopic: 2, blitzRoundsPerTeam: 1, pastQuestions: [] },
    players: [
      { name: "Alice", emoji: "😈", team: "red", online: true, ready: true },
      { name: "Bob", emoji: "👹", team: "red", online: true, ready: true },
      { name: "Dave", emoji: "🦊", team: "blue", online: true, ready: true },
    ],
    teams: [{ id: "red", score: 0, jokerUsed: false }, { id: "blue", score: 0, jokerUsed: false }],
    topics: [{ name: "T1", questions: [{ text: "Q1", difficulty: 100, acceptedAnswers: [] }, { text: "Q2", difficulty: 150, acceptedAnswers: [] }] }],
    blitzTasks: [{ items: [{ text: "Cat", difficulty: 200 }] }],
    currentRound: {
      type: "round", teamId: "red", captainName: "Alice", questionIndex: 0,
      jokerActive: false, answers: {}, activeTimerStartedAt: 0, bonusTime: 0,
    },
    history: [],
    timer: null,
    ...overrides,
  });
}

describe("TaskCardBlock visibility", () => {
  it("captain sees card open in round-active", () => {
    setupState();
    const { container } = render(<TaskCardBlock playerName="Alice" />);
    const wrapper = container.querySelector("[data-hidden]");
    expect(wrapper?.getAttribute("data-hidden")).toBe("false");
  });

  it("active-team non-captain sees card hidden in round-active", () => {
    setupState();
    const { container } = render(<TaskCardBlock playerName="Bob" />);
    const wrapper = container.querySelector("[data-hidden]");
    expect(wrapper?.getAttribute("data-hidden")).toBe("true");
  });

  it("both see card open in round-review", () => {
    setupState({ phase: "round-review" });
    const { container: c1 } = render(<TaskCardBlock playerName="Alice" />);
    expect(c1.querySelector("[data-hidden]")?.getAttribute("data-hidden")).toBe("false");
    const { container: c2 } = render(<TaskCardBlock playerName="Bob" />);
    expect(c2.querySelector("[data-hidden]")?.getAttribute("data-hidden")).toBe("false");
  });

  it("opponent card is hidden by default in round-active, clickable to toggle", () => {
    setupState();
    const { container } = render(<TaskCardBlock playerName="Dave" />);
    const wrapper = container.querySelector("[data-hidden]")!;
    expect(wrapper.getAttribute("data-hidden")).toBe("true");
    expect(wrapper.getAttribute("data-clickable")).toBe("true");
    fireEvent.click(wrapper);
    expect(wrapper.getAttribute("data-hidden")).toBe("false");
    fireEvent.click(wrapper);
    expect(wrapper.getAttribute("data-hidden")).toBe("true");
  });

  it("opponent card is open in round-review (no toggle needed)", () => {
    setupState({ phase: "round-review" });
    const { container } = render(<TaskCardBlock playerName="Dave" />);
    const wrapper = container.querySelector("[data-hidden]")!;
    expect(wrapper.getAttribute("data-hidden")).toBe("false");
  });

  it("host (no playerName) sees card hidden in round-active", () => {
    setupState();
    const { container } = render(<TaskCardBlock />);
    const wrapper = container.querySelector("[data-hidden]");
    expect(wrapper?.getAttribute("data-hidden")).toBe("true");
  });

  it("host sees card open in round-review", () => {
    setupState({ phase: "round-review" });
    const { container } = render(<TaskCardBlock />);
    const wrapper = container.querySelector("[data-hidden]");
    expect(wrapper?.getAttribute("data-hidden")).toBe("false");
  });
});
