/**
 * Скриншоты для фазы blitz-answer:
 * - Для ведущего
 * - Для игрока, который уже ответил в предыдущей фазе
 * - Для игрока, который ещё не ответил
 * - Для капитана
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

const playersPartial = players.map((p, i) =>
  i >= 1 && i <= 3 ? { ...p, hasAnswered: true } : p,
);

export const blitzAnswerScenarios: ScreenshotScenario[] = [
  {
    name: "blitz-answer_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("blitz-answer", {
        players: playersPartial,
        activeTeamId: "red",
        captainId: captain.id,
        currentBlitzItem: blitzItem,
        blitzTaskReveal: blitzItem,
        timer: timerAt(12),
        blitzAnswers: {
          [players[1].id]: "Токио",
          [players[2].id]: "Киото",
          [players[3].id]: "Токио",
        },
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "blitz-answer_already-answered_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-answer", {
        players: playersPartial,
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
  {
    name: "blitz-answer_not-answered_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-answer", {
        players: playersPartial,
        activeTeamId: "red",
        captainId: captain.id,
        blitzTaskReveal: blitzItem,
        timer: timerAt(12),
      }),
      playerName: players[4].name,
      localRole: "player",
    },
  },
  {
    name: "blitz-answer_captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-answer", {
        players: playersPartial,
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
];
