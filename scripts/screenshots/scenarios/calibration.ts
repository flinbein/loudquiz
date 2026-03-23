/**
 * Скриншоты для фазы calibration:
 * - Экран калибровки для ведущего
 * - Экран калибровки для игрока
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makeTwoTeamPlayers,
  makeDefaultSettings,
} from "../stateFactory";

const players = makeTwoTeamPlayers(5);

export const calibrationScenarios: ScreenshotScenario[] = [
  {
    name: "calibration_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("calibration", { players }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "calibration_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("calibration", { players }),
      playerName: players[0].name,
      localRole: "player",
    },
  },
];
