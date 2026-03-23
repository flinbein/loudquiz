/**
 * Скриншоты для фазы question-setup:
 * - Ведущий ещё не загрузил JSON (host + player)
 * - Ведущий загрузил JSON (host + player)
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makeTwoTeamPlayers,
  makeDefaultSettings,
  makeQuestionsFile,
} from "../stateFactory";

const players = makeTwoTeamPlayers(5);

export const questionSetupScenarios: ScreenshotScenario[] = [
  // ── JSON не загружен ──────────────────────────────────────────────────────
  {
    name: "question-setup_empty_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("question-setup", { players }),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "question-setup_empty_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("question-setup", {
        players,
        questionsReady: false,
      }),
      playerName: players[0].name,
      localRole: "player",
    },
  },

  // ── JSON загружен ─────────────────────────────────────────────────────────
  {
    name: "question-setup_loaded_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("question-setup", { players }),
      questionsPreview: makeQuestionsFile(),
      settings: makeDefaultSettings(),
    },
  },
  {
    name: "question-setup_loaded_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("question-setup", {
        players,
        questionsReady: true,
      }),
      playerName: players[0].name,
      localRole: "player",
    },
  },
];
