/**
 * Скриншоты для фазы round-captain:
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
  makePublicQuestionTable,
  makeQuestionHistory,
  USED_QUESTION_IDS,
  HISTORY_SCORES,
  HISTORY_JOKER_USED,
  HISTORY_JOKER_THIS_ROUND,
} from "../stateFactory";

const players = makeTwoTeamPlayers(5);
const playersWithExCaptain = players.map((p, i) =>
  i === 0 ? { ...p, wasRecentCaptain: true } : p,
);

const tableOverrides = {
  publicQuestionTable: makePublicQuestionTable(USED_QUESTION_IDS),
  questionHistory: makeQuestionHistory(),
  scores: HISTORY_SCORES,
  jokerUsed: HISTORY_JOKER_USED,
  jokerActivatedThisRound: HISTORY_JOKER_THIS_ROUND,
};

export const roundCaptainScenarios: ScreenshotScenario[] = [
  {
    name: "round-captain_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("round-captain", {
        players,
        activeTeamId: "red",
        ...tableOverrides,
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "round-captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-captain", {
        players,
        activeTeamId: "red",
        ...tableOverrides,
      }),
      playerName: players[1].name,
      localRole: "player",
    },
  },
  {
    name: "round-captain_ex-captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-captain", {
        players: playersWithExCaptain,
        activeTeamId: "red",
        ...tableOverrides,
      }),
      playerName: players[0].name,
      localRole: "player",
    },
  },
];
