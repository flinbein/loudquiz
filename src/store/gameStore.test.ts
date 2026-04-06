import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore, initialState } from "./gameStore";

describe("gameStore", () => {
  beforeEach(() => {
    useGameStore.setState({ ...initialState });
  });

  it("initializes with correct default state", () => {
    const state = useGameStore.getState();
    expect(state.phase).toBe("lobby");
    expect(state.settings.mode).toBe("manual");
    expect(state.settings.teamMode).toBe("single");
    expect(state.settings.topicCount).toBe(3);
    expect(state.settings.questionsPerTopic).toBe(4);
    expect(state.settings.blitzRoundsPerTeam).toBe(2);
    expect(state.players).toEqual([]);
    expect(state.teams).toEqual([]);
    expect(state.topics).toEqual([]);
    expect(state.blitzTasks).toEqual([]);
    expect(state.currentRound).toBeNull();
    expect(state.history).toEqual([]);
    expect(state.timer).toBeNull();
  });

  it("setState updates partial state", () => {
    useGameStore.getState().setState({ phase: "finale" });
    expect(useGameStore.getState().phase).toBe("finale");
    // Other fields unchanged
    expect(useGameStore.getState().players).toEqual([]);
  });

  it("resetGame restores initial state", () => {
    useGameStore.getState().setState({
      phase: "finale",
      players: [
        { name: "Alice", emoji: "🐱", team: "red", online: true, ready: true },
      ],
    });
    useGameStore.getState().resetGame();
    const state = useGameStore.getState();
    expect(state.phase).toBe("lobby");
    expect(state.players).toEqual([]);
  });
});
