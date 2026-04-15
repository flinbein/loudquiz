import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore, initialState } from "../gameStore";
import {
  handleJoin,
  handleSetTeam,
  handleSetReady,
  handleChangeEmoji,
  kickPlayer,
  movePlayer,
  startGame,
  canStartGame,
} from "./lobby";

function resetStore() {
  useGameStore.setState({
    ...initialState,
    settings: { ...initialState.settings, teamMode: "dual" },
    teams: [
      { id: "red", score: 0, jokerUsed: false },
      { id: "blue", score: 0, jokerUsed: false },
    ],
  });
}

function resetStoreSingle() {
  useGameStore.setState({
    ...initialState,
    settings: { ...initialState.settings, teamMode: "single" },
    teams: [{ id: "none", score: 0, jokerUsed: false }],
  });
}

describe("lobby actions", () => {
  beforeEach(resetStore);

  describe("handleJoin", () => {
    it("adds a new player with assigned emoji", () => {
      handleJoin("peer1", "Алексей");
      const state = useGameStore.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0]?.name).toBe("Алексей");
      expect(state.players[0]?.emoji).toBeTruthy();
      expect(state.players[0]?.online).toBe(true);
      expect(state.players[0]?.ready).toBe(false);
    });

    it("assigns to none team in single mode", () => {
      resetStoreSingle();
      handleJoin("peer1", "Алексей");
      expect(useGameStore.getState().players[0]?.team).toBe("none");
    });

    it("assigns none team in dual mode", () => {
      handleJoin("peer1", "Алексей");
      expect(useGameStore.getState().players[0]?.team).toBe("none");
    });

    it("reconnects existing player by name", () => {
      handleJoin("peer1", "Алексей");
      const players = useGameStore.getState().players.map((p) =>
        p.name === "Алексей" ? { ...p, online: false } : p,
      );
      useGameStore.getState().setState({ players });
      handleJoin("peer2", "Алексей");
      const state = useGameStore.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0]?.online).toBe(true);
    });

    it("assigns unique emojis to different players", () => {
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      const state = useGameStore.getState();
      expect(state.players[0]?.emoji).not.toBe(state.players[1]?.emoji);
    });
  });

  describe("handleSetTeam", () => {
    it("sets player team", () => {
      handleJoin("peer1", "Алексей");
      handleSetTeam("Алексей", "red");
      expect(useGameStore.getState().players[0]?.team).toBe("red");
    });

    it("does not change team if player is ready", () => {
      handleJoin("peer1", "Алексей");
      handleSetTeam("Алексей", "red");
      handleSetReady("Алексей", true);
      handleSetTeam("Алексей", "blue");
      expect(useGameStore.getState().players[0]?.team).toBe("red");
    });
  });

  describe("handleSetReady", () => {
    it("sets player ready state", () => {
      handleJoin("peer1", "Алексей");
      handleSetReady("Алексей", true);
      expect(useGameStore.getState().players[0]?.ready).toBe(true);
    });
  });

  describe("handleChangeEmoji", () => {
    it("does not change emoji if player is ready", () => {
      handleJoin("peer1", "Алексей");
      handleSetReady("Алексей", true);
      const emoji = useGameStore.getState().players[0]?.emoji;
      handleChangeEmoji("Алексей");
      expect(useGameStore.getState().players[0]?.emoji).toBe(emoji);
    });
  });

  describe("kickPlayer", () => {
    it("removes player from store", () => {
      handleJoin("peer1", "Алексей");
      handleJoin("peer2", "Маша");
      kickPlayer("Алексей");
      const state = useGameStore.getState();
      expect(state.players).toHaveLength(1);
      expect(state.players[0]?.name).toBe("Маша");
    });
  });

  describe("movePlayer", () => {
    it("moves player to another team", () => {
      handleJoin("peer1", "Алексей");
      movePlayer("Алексей", "blue");
      expect(useGameStore.getState().players[0]?.team).toBe("blue");
    });
  });

  describe("canStartGame / startGame", () => {
    it("returns false when not all players ready", () => {
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetTeam("Player1", "red");
      handleSetTeam("Player2", "red");
      handleSetReady("Player1", true);
      expect(canStartGame()).toBe(false);
    });

    it("returns false with fewer than 2 players per team", () => {
      handleJoin("peer1", "Player1");
      handleSetTeam("Player1", "red");
      handleSetReady("Player1", true);
      expect(canStartGame()).toBe(false);
    });

    it("returns false when player has no team (dual)", () => {
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetReady("Player1", true);
      handleSetReady("Player2", true);
      expect(canStartGame()).toBe(false);
    });

    it("returns true when all conditions met (single)", () => {
      resetStoreSingle();
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetReady("Player1", true);
      handleSetReady("Player2", true);
      expect(canStartGame()).toBe(true);
    });

    it("returns true when all conditions met (dual)", () => {
      handleJoin("peer1", "P1");
      handleJoin("peer2", "P2");
      handleJoin("peer3", "P3");
      handleJoin("peer4", "P4");
      handleSetTeam("P1", "red");
      handleSetTeam("P2", "red");
      handleSetTeam("P3", "blue");
      handleSetTeam("P4", "blue");
      handleSetReady("P1", true);
      handleSetReady("P2", true);
      handleSetReady("P3", true);
      handleSetReady("P4", true);
      expect(canStartGame()).toBe(true);
    });

    it("startGame transitions to round-captain for manual mode", () => {
      resetStoreSingle();
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetReady("Player1", true);
      handleSetReady("Player2", true);
      startGame();
      expect(useGameStore.getState().phase).toBe("round-captain");
    });

    it("startGame transitions to topics-collecting for AI mode", () => {
      useGameStore.setState({
        ...initialState,
        settings: { ...initialState.settings, mode: "ai", teamMode: "single" },
        teams: [{ id: "none", score: 0, jokerUsed: false }],
      });
      handleJoin("peer1", "Player1");
      handleJoin("peer2", "Player2");
      handleSetReady("Player1", true);
      handleSetReady("Player2", true);
      startGame();
      const s = useGameStore.getState();
      expect(s.phase).toBe("topics-collecting");
      expect(s.topicsSuggest).toBeDefined();
      expect(s.topicsSuggest?.suggestions).toEqual({});
      expect(s.topicsSuggest?.noIdeas).toEqual([]);
      expect(s.topicsSuggest?.manualTopics).toBeNull();
      expect(s.topicsSuggest?.timerEndsAt).not.toBeNull();
      expect(s.topicsSuggest?.generationStep).toBeNull();
      expect(s.topicsSuggest?.aiError).toBeNull();
      expect(s.timer).not.toBeNull();
    });
  });
});
