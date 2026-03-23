/**
 * Скриншоты для фазы topic-suggest:
 * - 10 игроков, 1 команда, нет предложений (host + player)
 * - 10 игроков, 1 команда, 20 предложений (host + player)
 * - По 10 игроков, 2 команды, нет предложений (host + player)
 * - По 10 игроков, 2 команды, 20 предложений (host + player)
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makePlayers,
  makeTwoTeamPlayers,
  makeDefaultSettings,
  PLAYER_NAMES,
} from "../stateFactory";

const SAMPLE_TOPICS = [
  "Космос", "Кино", "Музыка", "Спорт", "Животные",
  "Еда", "Путешествия", "Наука", "История", "Игры",
  "Мода", "Книги", "Технологии", "Природа", "Искусство",
  "Медицина", "Архитектура", "Философия", "Математика", "Автомобили",
];

function makeSuggestions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    playerName: PLAYER_NAMES[i % PLAYER_NAMES.length],
    text: SAMPLE_TOPICS[i % SAMPLE_TOPICS.length],
  }));
}

const players1team = makePlayers(10, "red");
const players2teams = makeTwoTeamPlayers(10);

export const topicSuggestScenarios: ScreenshotScenario[] = [
  // ── 1 команда, нет предложений ────────────────────────────────────────────
  {
    name: "topic-suggest_1team-empty_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("topic-suggest", {
        players: players1team,
        scores: { red: 0 },
        suggestions: [],
        topicSuggestEndsAt: Date.now() + 60000,
        settings: makeDefaultSettings({ teamCount: 1, hostType: "ai" }),
      }),
      settings: makeDefaultSettings({ teamCount: 1, hostType: "ai" }),
    },
  },
  {
    name: "topic-suggest_1team-empty_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("topic-suggest", {
        players: players1team,
        scores: { red: 0 },
        suggestions: [],
        topicSuggestEndsAt: Date.now() + 60000,
        settings: { teamCount: 1, gameMode: "standard", hostType: "ai" },
      }),
      playerName: players1team[0].name,
      localRole: "player",
    },
  },

  // ── 1 команда, 20 предложений ────────────────────────────────────────────
  {
    name: "topic-suggest_1team-filled_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("topic-suggest", {
        players: players1team,
        scores: { red: 0 },
        suggestions: makeSuggestions(20),
        topicSuggestEndsAt: Date.now() + 30000,
        settings: makeDefaultSettings({ teamCount: 1, hostType: "ai" }),
      }),
      settings: makeDefaultSettings({ teamCount: 1, hostType: "ai" }),
    },
  },
  {
    name: "topic-suggest_1team-filled_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("topic-suggest", {
        players: players1team,
        scores: { red: 0 },
        suggestions: makeSuggestions(20),
        topicSuggestEndsAt: Date.now() + 30000,
        settings: { teamCount: 1, gameMode: "standard", hostType: "ai" },
      }),
      playerName: players1team[0].name,
      localRole: "player",
    },
  },

  // ── 2 команды, нет предложений ────────────────────────────────────────────
  {
    name: "topic-suggest_2teams-empty_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("topic-suggest", {
        players: players2teams,
        suggestions: [],
        topicSuggestEndsAt: Date.now() + 60000,
        settings: makeDefaultSettings({ hostType: "ai" }),
      }),
      settings: makeDefaultSettings({ hostType: "ai" }),
    },
  },
  {
    name: "topic-suggest_2teams-empty_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("topic-suggest", {
        players: players2teams,
        suggestions: [],
        topicSuggestEndsAt: Date.now() + 60000,
        settings: { teamCount: 2, gameMode: "standard", hostType: "ai" },
      }),
      playerName: players2teams[0].name,
      localRole: "player",
    },
  },

  // ── 2 команды, 20 предложений ────────────────────────────────────────────
  {
    name: "topic-suggest_2teams-filled_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("topic-suggest", {
        players: players2teams,
        suggestions: makeSuggestions(20),
        topicSuggestEndsAt: Date.now() + 30000,
        settings: makeDefaultSettings({ hostType: "ai" }),
      }),
      settings: makeDefaultSettings({ hostType: "ai" }),
    },
  },
  {
    name: "topic-suggest_2teams-filled_player",
    view: "player",
    mockPlayer: {
      gameState: makePublicState("topic-suggest", {
        players: players2teams,
        suggestions: makeSuggestions(20),
        topicSuggestEndsAt: Date.now() + 30000,
        settings: { teamCount: 2, gameMode: "standard", hostType: "ai" },
      }),
      playerName: players2teams[0].name,
      localRole: "player",
    },
  },
];
