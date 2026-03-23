/**
 * Скриншоты для фазы round-result:
 * - Для ведущего
 * - Для игрока
 * 10 игроков красной команды, 4 верных, 2 не успели.
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makePlayers,
  makeDefaultSettings,
  makePublicQuestionTable,
  makeQuestionHistory,
  makeRoundResult,
  USED_QUESTION_IDS,
  HISTORY_SCORES,
  HISTORY_JOKER_USED,
  HISTORY_JOKER_THIS_ROUND,
} from "../stateFactory";

const redPlayers = makePlayers(10, "red");
const redNames = redPlayers.map((p) => p.name);
const roundResult = makeRoundResult(redNames, 4, 2, false);
const usedIds = [...USED_QUESTION_IDS, "q3"];

const roundInfo = { topicName: "Животные", difficulty: 150, questionId: "q3" };

const tableOverrides = {
  publicQuestionTable: makePublicQuestionTable(usedIds),
  questionHistory: makeQuestionHistory(),
  jokerUsed: { red: HISTORY_JOKER_USED.red },
  jokerActivatedThisRound: { red: HISTORY_JOKER_THIS_ROUND.red },
  currentRound: roundInfo,
};

export const roundResultScenarios: ScreenshotScenario[] = [
  {
    name: "round-result_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("round-result", {
        players: redPlayers,
        activeTeamId: "red",
        captainId: redPlayers[0].id,
        questionRevealText: "Какая птица не умеет летать?",
        roundResult,
        scores: { red: HISTORY_SCORES.red + 400 },
        settings: makeDefaultSettings({ teamCount: 1 }),
        ...tableOverrides,
      }),
      settings: makeDefaultSettings({ teamCount: 1 }),
    },
  },
  {
    name: "round-result_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-result", {
        players: redPlayers,
        activeTeamId: "red",
        captainId: redPlayers[0].id,
        questionRevealText: "Какая птица не умеет летать?",
        roundResult,
        scores: { red: HISTORY_SCORES.red + 400 },
        settings: { teamCount: 1, gameMode: "standard", hostType: "human" },
        ...tableOverrides,
      }),
      playerName: redPlayers[1].name,
      localRole: "player",
    },
  },
];
