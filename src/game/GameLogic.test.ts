import { describe, it, expect, beforeEach } from "vitest";
import { GameLogic } from "./GameLogic";
import type { GameSettings } from "./types";

const makeSettings = (overrides?: Partial<GameSettings>): GameSettings => ({
  backendUrl: "https://example.com",
  teamCount: 2,
  gameMode: "standard",
  hostType: "human",
  roundDuration: 60,
  answerDuration: 25,
  questionsPerTopic: 4,
  topicCount: 3,
  ...overrides,
});

describe("GameLogic - isAllPlayersReady", () => {
  let gl: GameLogic;
  let broadcasts: unknown[];

  beforeEach(() => {
    broadcasts = [];
    gl = new GameLogic(
      { broadcast: (msg) => broadcasts.push(msg), onStateChange: () => {} },
      makeSettings(),
    );
  });

  it("returns false when no active players", () => {
    expect(gl.isAllPlayersReady()).toBe(false);
  });

  it("returns false when some players not ready", () => {
    gl.handleMessage("p1", { type: "join", name: "Alice", role: "player" });
    gl.handleMessage("p1", { type: "setTeam", teamId: "red" });
    gl.handleMessage("p2", { type: "join", name: "Bob", role: "player" });
    gl.handleMessage("p2", { type: "setTeam", teamId: "blue" });
    gl.startGame();
    gl.handleMessage("p1", { type: "ready" });
    expect(gl.isAllPlayersReady()).toBe(false);
  });

  it("returns true when all active players ready", () => {
    gl.handleMessage("p1", { type: "join", name: "Alice", role: "player" });
    gl.handleMessage("p1", { type: "setTeam", teamId: "red" });
    gl.startGame();
    gl.handleMessage("p1", { type: "ready" });
    expect(gl.isAllPlayersReady()).toBe(true);
  });

  it("ignores spectators for all-ready check", () => {
    gl.handleMessage("p1", { type: "join", name: "Alice", role: "player" });
    gl.handleMessage("p1", { type: "setTeam", teamId: "red" });
    gl.handleMessage("s1", { type: "join", name: "Spectator", role: "spectator" });
    gl.startGame();
    gl.handleMessage("p1", { type: "ready" });
    expect(gl.isAllPlayersReady()).toBe(true);
  });
});

describe("GameLogic - team selection", () => {
  let gl: GameLogic;

  beforeEach(() => {
    gl = new GameLogic(
      { broadcast: () => {}, onStateChange: () => {} },
      makeSettings({ teamCount: 2 }),
    );
    gl.handleMessage("p1", { type: "join", name: "Alice", role: "player" });
  });

  it("player starts unassigned in 2-team mode", () => {
    const state = gl.getFullState();
    expect(state.players[0].teamId).toBe(null);
  });

  it("player can choose red team", () => {
    gl.handleMessage("p1", { type: "setTeam", teamId: "red" });
    expect(gl.getFullState().players[0].teamId).toBe("red");
  });

  it("player can choose blue team", () => {
    gl.handleMessage("p1", { type: "setTeam", teamId: "blue" });
    expect(gl.getFullState().players[0].teamId).toBe("blue");
  });

  it("auto-assigns to red in 1-team mode", () => {
    const gl1 = new GameLogic(
      { broadcast: () => {}, onStateChange: () => {} },
      makeSettings({ teamCount: 1 }),
    );
    gl1.handleMessage("p1", { type: "join", name: "Alice", role: "player" });
    expect(gl1.getFullState().players[0].teamId).toBe("red");
  });

  it("spectator always has null teamId", () => {
    const gl2 = new GameLogic(
      { broadcast: () => {}, onStateChange: () => {} },
      makeSettings({ teamCount: 1 }),
    );
    gl2.handleMessage("s1", { type: "join", name: "Viewer", role: "spectator" });
    expect(gl2.getFullState().players[0].teamId).toBe(null);
  });
});

describe("GameLogic - calibration phase", () => {
  let gl: GameLogic;

  beforeEach(() => {
    gl = new GameLogic(
      { broadcast: () => {}, onStateChange: () => {} },
      makeSettings({ hostType: "human" }),
    );
    gl.handleMessage("p1", { type: "join", name: "Alice", role: "player" });
    gl.handleMessage("p1", { type: "setTeam", teamId: "red" });
    gl.startGame();
  });

  it("transitions to calibration phase on startGame()", () => {
    expect(gl.getFullState().phase).toBe("calibration");
  });

  it("transitions to question-setup when all players ready (human mode)", () => {
    gl.handleMessage("p1", { type: "ready" });
    expect(gl.getFullState().phase).toBe("question-setup");
  });

  it("forceCalibrationDone transitions to question-setup", () => {
    gl.forceCalibrationDone();
    expect(gl.getFullState().phase).toBe("question-setup");
  });
});

describe("GameLogic - suggestions", () => {
  let gl: GameLogic;

  beforeEach(() => {
    gl = new GameLogic(
      { broadcast: () => {}, onStateChange: () => {} },
      makeSettings({ hostType: "ai" }),
    );
    gl.handleMessage("p1", { type: "join", name: "Alice", role: "player" });
    gl.handleMessage("p1", { type: "setTeam", teamId: "red" });
    gl.startGame();
    gl.forceCalibrationDone(); // → topic-suggest
  });

  it("transitions to topic-suggest in AI mode", () => {
    expect(gl.getFullState().phase).toBe("topic-suggest");
  });

  it("allows player to suggest topics", () => {
    gl.handleMessage("p1", { type: "suggest", text: "Музыка" });
    expect(gl.getFullState().suggestions?.[0].text).toBe("Музыка");
  });

  it("limits suggestions to 3 per player", () => {
    gl.handleMessage("p1", { type: "suggest", text: "А" });
    gl.handleMessage("p1", { type: "suggest", text: "Б" });
    gl.handleMessage("p1", { type: "suggest", text: "В" });
    gl.handleMessage("p1", { type: "suggest", text: "Г" }); // 4th — should be ignored
    expect(gl.getFullState().suggestions?.length).toBe(3);
  });

  it("counts suggestions correctly via getSuggestCountForPlayer", () => {
    gl.handleMessage("p1", { type: "suggest", text: "А" });
    gl.handleMessage("p1", { type: "suggest", text: "Б" });
    expect(gl.getSuggestCountForPlayer("p1")).toBe(2);
  });
});
