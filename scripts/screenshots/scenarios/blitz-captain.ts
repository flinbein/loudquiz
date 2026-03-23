/**
 * Скриншоты для фазы blitz-captain:
 * - Для ведущего
 * - Для игрока
 * - Для игрока, который уже был капитаном
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makeTwoTeamPlayers,
  makeDefaultSettings,
  makeBlitzTasksPublic,
} from "../stateFactory";

const players = makeTwoTeamPlayers(5);

export const blitzCaptainScenarios: ScreenshotScenario[] = [
  {
    name: "blitz-captain_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("blitz-captain", {
        players,
        activeTeamId: "red",
        publicBlitzTasks: makeBlitzTasksPublic(),
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "blitz-captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-captain", {
        players,
        activeTeamId: "red",
        publicBlitzTasks: makeBlitzTasksPublic(),
      }),
      playerName: players[1].name,
      localRole: "player",
    },
  },
  {
    name: "blitz-captain_ex-captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-captain", {
        players: players.map((p, i) =>
          i === 0 ? { ...p, wasRecentCaptain: true } : p,
        ),
        activeTeamId: "red",
        publicBlitzTasks: makeBlitzTasksPublic(),
      }),
      playerName: players[0].name,
      localRole: "player",
    },
  },
];
