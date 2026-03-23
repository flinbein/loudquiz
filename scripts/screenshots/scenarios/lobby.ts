/**
 * Скриншоты для фазы lobby:
 * - Пустой лобби для 1 команды (host + player)
 * - Пустой лобби для 2 команд (host + player)
 * - Заполненный лобби для 1 команды, 10 игроков (host + player)
 * - Заполненный лобби для 2 команд, по 10 игроков (host + player)
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makePlayers,
  makeTwoTeamPlayers,
  makeDefaultSettings,
} from "../stateFactory";

export const lobbyScenarios: ScreenshotScenario[] = [
  // ── Пустой лобби, 1 команда ──────────────────────────────────────────────
  {
    name: "lobby_empty-1team_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("lobby", {
        players: [],
        scores: { red: 0 },
        settings: makeDefaultSettings({ teamCount: 1 }),
      }),
      settings: makeDefaultSettings({ teamCount: 1 }),
    },
  },
  {
    name: "lobby_empty-1team_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("lobby", {
        players: [],
        scores: { red: 0 },
        settings: { teamCount: 1, gameMode: "standard", hostType: "human" },
      }),
      playerName: "Алексей",
      localRole: "player",
    },
  },

  // ── Пустой лобби, 2 команды ──────────────────────────────────────────────
  {
    name: "lobby_empty-2teams_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("lobby", {
        players: [],
        scores: { red: 0, blue: 0 },
      }),
      settings: makeDefaultSettings({ teamCount: 2 }),
    },
  },
  {
    name: "lobby_empty-2teams_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("lobby", {
        players: [],
        scores: { red: 0, blue: 0 },
      }),
      playerName: "Алексей",
      localRole: "player",
    },
  },

  // ── Заполненный лобби, 1 команда, 10 игроков ─────────────────────────────
  {
    name: "lobby_filled-1team_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("lobby", {
        players: makePlayers(10, "red"),
        scores: { red: 0 },
        settings: makeDefaultSettings({ teamCount: 1 }),
      }),
      settings: makeDefaultSettings({ teamCount: 1 }),
    },
  },
  {
    name: "lobby_filled-1team_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("lobby", {
        players: makePlayers(10, "red"),
        scores: { red: 0 },
        settings: { teamCount: 1, gameMode: "standard", hostType: "human" },
      }),
      playerName: "Алексей",
      localRole: "player",
    },
  },

  // ── Заполненный лобби, 2 команды, по 10 игроков ──────────────────────────
  {
    name: "lobby_filled-2teams_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("lobby", {
        players: makeTwoTeamPlayers(10),
        scores: { red: 0, blue: 0 },
      }),
      settings: makeDefaultSettings({ teamCount: 2 }),
    },
  },
  {
    name: "lobby_filled-2teams_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("lobby", {
        players: makeTwoTeamPlayers(10),
        scores: { red: 0, blue: 0 },
      }),
      playerName: "Алексей",
      localRole: "player",
    },
  },
];
