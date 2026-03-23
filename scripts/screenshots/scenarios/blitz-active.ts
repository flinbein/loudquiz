/**
 * Скриншоты для фазы blitz-active:
 * - Для ведущего
 * - Для капитана
 * - Для игрока, который ещё не дал ответ
 * - Для игрока, который уже дал ответ
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makeTwoTeamPlayers,
  makeDefaultSettings,
  makeBlitzItem,
  timerAt,
} from "../stateFactory";

const players = makeTwoTeamPlayers(5);
const captain = players[0];
const blitzItem = makeBlitzItem();

export const blitzActiveScenarios: ScreenshotScenario[] = [
  {
    name: "blitz-active_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("blitz-active", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        currentBlitzItem: blitzItem,
        blitzTaskReveal: blitzItem,
        timer: timerAt(12),
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "blitz-active_captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-active", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        blitzTaskReveal: blitzItem,
        timer: timerAt(12),
      }),
      playerName: captain.name,
      localRole: "player",
      blitzCaptainItem: blitzItem,
    },
  },
  {
    name: "blitz-active_not-answered_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-active", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        blitzTaskReveal: blitzItem,
        timer: timerAt(12),
      }),
      playerName: players[1].name,
      localRole: "player",
    },
  },
  {
    name: "blitz-active_answered_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-active", {
        players: players.map((p, i) =>
          i === 1 ? { ...p, hasAnswered: true } : p,
        ),
        activeTeamId: "red",
        captainId: captain.id,
        blitzTaskReveal: blitzItem,
        timer: timerAt(12),
      }),
      playerName: players[1].name,
      localRole: "player",
      blitzAnswerSent: true,
    },
  },
];
