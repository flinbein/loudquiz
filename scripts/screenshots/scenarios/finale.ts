/**
 * Скриншоты для фазы finale:
 * - Для ведущего, 1 команда
 * - Для ведущего, 2 команды
 * - Для игрока, 1 команда
 * - Для игрока победившей команды (2 команды)
 * - Для игрока проигравшей команды (2 команды)
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makePlayers,
  makeTwoTeamPlayers,
  makeDefaultSettings,
} from "../stateFactory";

const players1team = makePlayers(10, "red");
const players2teams = makeTwoTeamPlayers(10);

export const finaleScenarios: ScreenshotScenario[] = [
  // ── 1 команда ─────────────────────────────────────────────────────────────
  {
    name: "finale_1team_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("finale", {
        players: players1team,
        scores: { red: 2400 },
        gameStats: {
          topAnswererName: players1team[1].name,
          topAnswererCount: 5,
          topCaptainName: players1team[0].name,
          topCaptainCount: 3,
        },
        settings: makeDefaultSettings({ teamCount: 1 }),
      }),
      settings: makeDefaultSettings({ teamCount: 1 }),
    },
  },
  {
    name: "finale_1team_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("finale", {
        players: players1team,
        scores: { red: 2400 },
        gameStats: {
          topAnswererName: players1team[1].name,
          topAnswererCount: 5,
          topCaptainName: players1team[0].name,
          topCaptainCount: 3,
        },
        settings: { teamCount: 1, gameMode: "standard", hostType: "human" },
      }),
      playerName: players1team[0].name,
      localRole: "player",
    },
  },

  // ── 2 команды ─────────────────────────────────────────────────────────────
  {
    name: "finale_2teams_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("finale", {
        players: players2teams,
        scores: { red: 2800, blue: 1600 },
        gameStats: {
          topAnswererName: players2teams[0].name,
          topAnswererCount: 6,
          topCaptainName: players2teams[10].name,
          topCaptainCount: 2,
        },
      }),
      settings: makeDefaultSettings({ teamCount: 2 }),
    },
  },
  {
    name: "finale_2teams-winner_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("finale", {
        players: players2teams,
        scores: { red: 2800, blue: 1600 },
        gameStats: {
          topAnswererName: players2teams[0].name,
          topAnswererCount: 6,
          topCaptainName: players2teams[10].name,
          topCaptainCount: 2,
        },
      }),
      playerName: players2teams[0].name, // Красная команда — победители
      localRole: "player",
    },
  },
  {
    name: "finale_2teams-loser_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("finale", {
        players: players2teams,
        scores: { red: 2800, blue: 1600 },
        gameStats: {
          topAnswererName: players2teams[0].name,
          topAnswererCount: 6,
          topCaptainName: players2teams[10].name,
          topCaptainCount: 2,
        },
      }),
      playerName: players2teams[10].name, // Синяя команда — проигравшие
      localRole: "player",
    },
  },
];
