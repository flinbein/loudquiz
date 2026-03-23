/**
 * Скриншоты для фазы blitz-pick:
 * - Для ведущего
 * - Для игрока
 * - Для игрока-капитана
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
const captain = players[0];

export const blitzPickScenarios: ScreenshotScenario[] = [
  {
    name: "blitz-pick_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("blitz-pick", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        publicBlitzTasks: makeBlitzTasksPublic(),
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "blitz-pick_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-pick", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        publicBlitzTasks: makeBlitzTasksPublic(),
      }),
      playerName: players[1].name,
      localRole: "player",
    },
  },
  {
    name: "blitz-pick_captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-pick", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        publicBlitzTasks: makeBlitzTasksPublic(),
      }),
      playerName: captain.name,
      localRole: "player",
    },
  },
];
