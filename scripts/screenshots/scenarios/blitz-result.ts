/**
 * Скриншоты для фазы blitz-result:
 * - Для ведущего
 * - Для игрока
 * Считаем: 5 правильных, 4 неправильных, 1 не успел.
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makePlayers,
  makeDefaultSettings,
  makeBlitzItem,
} from "../stateFactory";

const players = makePlayers(10, "red");
const blitzItem = makeBlitzItem();

// 5 правильных, 4 неправильных, 1 не ответил
const playersWithAnswers = players.map((p, i) =>
  i < 9 ? { ...p, hasAnswered: true } : p,
);

export const blitzResultScenarios: ScreenshotScenario[] = [
  {
    name: "blitz-result_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("blitz-result", {
        players: playersWithAnswers,
        activeTeamId: "red",
        captainId: players[0].id,
        currentBlitzItem: blitzItem,
        blitzTaskReveal: blitzItem,
        scores: { red: 600 },
        blitzAnswers: Object.fromEntries(
          players.slice(0, 9).map((p, i) => [
            p.id,
            i < 5 ? "Токио" : ["Киото", "Осака", "Пекин", "Сеул"][i - 5],
          ]),
        ),
        settings: makeDefaultSettings({ teamCount: 1 }),
      }),
      settings: makeDefaultSettings({ teamCount: 1 }),
    },
  },
  {
    name: "blitz-result_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("blitz-result", {
        players: playersWithAnswers,
        activeTeamId: "red",
        captainId: players[0].id,
        blitzTaskReveal: blitzItem,
        scores: { red: 600 },
        settings: { teamCount: 1, gameMode: "standard", hostType: "human" },
      }),
      playerName: players[1].name,
      localRole: "player",
    },
  },
];
