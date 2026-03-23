/**
 * Скриншоты для фазы round-answer:
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

// Некоторые игроки уже ответили в round-active
const playersPartialAnswered = players.map((p, i) =>
  i >= 1 && i <= 3 ? { ...p, hasAnswered: true } : p,
);

export const roundAnswerScenarios: ScreenshotScenario[] = [
  {
    name: "round-answer_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("round-answer", {
        players: playersPartialAnswered,
        activeTeamId: "red",
        captainId: captain.id,
        currentQuestion: { id: "q3", text: "Какая птица не умеет летать?", difficulty: 150 },
        timer: timerAt(12),
        allAnswers: {
          [players[1].id]: "Пингвин",
          [players[2].id]: "Страус",
          [players[3].id]: "Киви",
        },
        ...tableOverrides,
      }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "round-answer_already-answered_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-answer", {
        players: playersPartialAnswered,
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
  {
    name: "round-answer_not-answered_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-answer", {
        players: playersPartialAnswered,
        activeTeamId: "red",
        captainId: captain.id,
        timer: timerAt(12),
        ...tableOverrides,
      }),
      playerName: players[4].name,
      localRole: "player",
    },
  },
  {
    name: "round-answer_captain_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-answer", {
        players: playersPartialAnswered,
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
];
