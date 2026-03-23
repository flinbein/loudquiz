/**
 * Скриншоты для фазы blitz-ready:
 * - Для ведущего
 * - Для игрока
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makeTwoTeamPlayers,
  makeDefaultSettings,
} from "../stateFactory";

const players = makeTwoTeamPlayers(5);

export const blitzReadyScenarios: ScreenshotScenario[] = [
  {
    name: "blitz-ready_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("blitz-ready", {
        players,
        activeTeamId: "red",
        captainId: players[0].id,
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "blitz-ready_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-ready", {
        players,
        activeTeamId: "red",
        captainId: players[0].id,
      }),
      playerName: players[1].name,
      localRole: "player",
    },
  },
];
