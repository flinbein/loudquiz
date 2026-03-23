/**
 * Скриншоты для фазы round-active:
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
  makePublicQuestionTable,
  makeQuestionHistory,
  USED_QUESTION_IDS,
  HISTORY_SCORES,
  HISTORY_JOKER_USED,
  HISTORY_JOKER_THIS_ROUND,
  timerAt,
} from "../stateFactory";

const players = makeTwoTeamPlayers(5);
const captain = players[0];

const roundInfo = { topicName: "Животные", difficulty: 150, questionId: "q3" };
const usedIds = [...USED_QUESTION_IDS, "q3"];

const tableOverrides = {
  publicQuestionTable: makePublicQuestionTable(usedIds),
  questionHistory: makeQuestionHistory(),
  scores: HISTORY_SCORES,
  jokerUsed: HISTORY_JOKER_USED,
  jokerActivatedThisRound: HISTORY_JOKER_THIS_ROUND,
  currentRound: roundInfo,
};

export const roundActiveScenarios: ScreenshotScenario[] = [
  {
    name: "round-active_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("round-active", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        currentQuestion: { id: "q3", text: "Какая птица не умеет летать?", difficulty: 150 },
        timer: timerAt(12),
        ...tableOverrides,
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "round-active_captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-active", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        timer: timerAt(12),
        ...tableOverrides,
      }),
      playerName: captain.name,
      localRole: "player",
      captainInfo: { questionText: "Какая птица не умеет летать?" },
    },
  },
  {
    name: "round-active_not-answered_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-active", {
        players,
        activeTeamId: "red",
        captainId: captain.id,
        timer: timerAt(12),
        ...tableOverrides,
      }),
      playerName: players[1].name,
      localRole: "player",
    },
  },
  {
    name: "round-active_answered_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-active", {
        players: players.map((p, i) =>
          i === 1 ? { ...p, hasAnswered: true } : p,
        ),
        activeTeamId: "red",
        captainId: captain.id,
        timer: timerAt(12),
        ...tableOverrides,
      }),
      playerName: players[1].name,
      localRole: "player",
      answerSent: true,
    },
  },
];
