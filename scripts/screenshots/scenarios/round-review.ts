/**
 * Скриншоты для фазы round-review:
 * - Для ведущего
 * - Для игрока
 * 10 игроков красной команды, 8 дали ответ, 2 не успели.
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makePlayers,
  makeDefaultSettings,
  makePublicQuestionTable,
  makeQuestionHistory,
  makeReviewGroups,
  USED_QUESTION_IDS,
  HISTORY_SCORES,
  HISTORY_JOKER_USED,
  HISTORY_JOKER_THIS_ROUND,
} from "../stateFactory";

const redPlayers = makePlayers(10, "red");
const redNames = redPlayers.map((p) => p.name);
const reviewGroups = makeReviewGroups(redNames, 4, 2);
const usedIds = [...USED_QUESTION_IDS, "q3"];

// 8 ответили, 2 нет
const playersWithAnswers = redPlayers.map((p, i) =>
  i < 8 ? { ...p, hasAnswered: true } : p,
);

const allAnswers: Record<string, string> = {};
playersWithAnswers.forEach((p, i) => {
  if (i < 8) {
    allAnswers[p.id] = ["Гепард", "Гепард", "Леопард", "Леопард", "Слон", "Лев", "Кот", "Черепаха"][i];
  }
});

const roundInfo = { topicName: "Животные", difficulty: 150, questionId: "q3" };

const tableOverrides = {
  publicQuestionTable: makePublicQuestionTable(usedIds),
  questionHistory: makeQuestionHistory(),
  scores: { red: HISTORY_SCORES.red },
  jokerUsed: { red: HISTORY_JOKER_USED.red },
  jokerActivatedThisRound: { red: HISTORY_JOKER_THIS_ROUND.red },
  currentRound: roundInfo,
};

export const roundReviewScenarios: ScreenshotScenario[] = [
  {
    name: "round-review_red_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("round-review", {
        players: playersWithAnswers,
        activeTeamId: "red",
        captainId: redPlayers[0].id,
        currentQuestion: { id: "q3", text: "Какая птица не умеет летать?", difficulty: 150 },
        allAnswers,
        settings: makeDefaultSettings({ teamCount: 1 }),
        ...tableOverrides,
      }),
      reviewGroups,
      settings: makeDefaultSettings({ teamCount: 1 }),
    },
  },
  {
    name: "round-review_red_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("round-review", {
        players: playersWithAnswers,
        activeTeamId: "red",
        captainId: redPlayers[0].id,
        settings: { teamCount: 1, gameMode: "standard", hostType: "human" },
        ...tableOverrides,
      }),
      playerName: redPlayers[1].name,
      localRole: "player",
    },
  },
];
