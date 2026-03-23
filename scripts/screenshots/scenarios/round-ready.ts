/**
 * Скриншоты для фазы round-ready:
 * - Для ведущего
 * - Для игрока
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
const usedIds = [...USED_QUESTION_IDS, "q3"];

const tableOverrides = {
  publicQuestionTable: makePublicQuestionTable(usedIds),
  questionHistory: makeQuestionHistory(),
  scores: HISTORY_SCORES,
  jokerUsed: HISTORY_JOKER_USED,
  jokerActivatedThisRound: HISTORY_JOKER_THIS_ROUND,
  currentRound: { topicName: "Животные", difficulty: 150, questionId: "q3" },
};

export const roundReadyScenarios: ScreenshotScenario[] = [
  {
    name: "round-ready_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("round-ready", {
        players,
        activeTeamId: "red",
        captainId: players[0].id,
        ...tableOverrides,
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "round-ready_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-ready", {
        players,
        activeTeamId: "red",
        captainId: players[0].id,
        ...tableOverrides,
      }),
      playerName: players[1].name,
      localRole: "player",
    },
  },
];
