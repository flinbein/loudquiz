/**
 * Фабрика мок-состояний для генерации скриншотов.
 * Предоставляет хелперы для создания реалистичных игровых состояний.
 */
import type {
  PublicGameState,
  FullGameState,
  PublicPlayerInfo,
  GameSettings,
  QuestionsFile,
  AnswerGroup,
  PublicTopicRow,
  RoundResult,
  GamePhase,
  BlitzItem,
} from "../../src/game/types";
import type { BlitzTaskPublic } from "../../src/game/messages";

// ── Пул русских имён ──────────────────────────────────────────────────────────

export const PLAYER_NAMES = [
  "Алексей", "Мария", "Дмитрий", "Анна", "Сергей",
  "Елена", "Иван", "Ольга", "Николай", "Татьяна",
  "Павел", "Юлия", "Андрей", "Наталья", "Михаил",
  "Виктория", "Артём", "Светлана", "Максим", "Кристина",
];

// ── Игроки ────────────────────────────────────────────────────────────────────

export function makePlayers(
  count: number,
  teamId: string | null,
  overrides?: Partial<PublicPlayerInfo>[],
): PublicPlayerInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    id: PLAYER_NAMES[i] ?? `Player${i + 1}`,
    name: PLAYER_NAMES[i] ?? `Player${i + 1}`,
    role: "player" as const,
    teamId,
    hasAnswered: false,
    isReady: false,
    wasRecentCaptain: false,
    online: true,
    ...overrides?.[i],
  }));
}

export function makeTwoTeamPlayers(countPerTeam: number): PublicPlayerInfo[] {
  const red = makePlayers(countPerTeam, "red");
  const blue = makePlayers(countPerTeam, "blue").map((p, i) => ({
    ...p,
    id: PLAYER_NAMES[countPerTeam + i] ?? `Player${countPerTeam + i + 1}`,
    name: PLAYER_NAMES[countPerTeam + i] ?? `Player${countPerTeam + i + 1}`,
  }));
  return [...red, ...blue];
}

// ── Настройки ─────────────────────────────────────────────────────────────────

export function makeDefaultSettings(overrides?: Partial<GameSettings>): GameSettings {
  return {
    backendUrl: "wss://varhub.flinbein.ru",
    teamCount: 2,
    gameMode: "standard",
    hostType: "human",
    roundDuration: 60,
    answerDuration: 25,
    questionsPerTopic: 4,
    topicCount: 3,
    blitzRoundCount: 3,
    ...overrides,
  };
}

// ── Таблица вопросов ──────────────────────────────────────────────────────────

export function makeQuestionsFile(): QuestionsFile {
  return {
    topics: [
      {
        name: "Животные",
        questions: [
          { id: "q1", text: "Какое животное самое быстрое?", difficulty: 100 },
          { id: "q2", text: "Сколько ног у паука?", difficulty: 120 },
          { id: "q3", text: "Какая птица не умеет летать?", difficulty: 150 },
          { id: "q10", text: "Самое большое млекопитающее?", difficulty: 180 },
        ],
      },
      {
        name: "География",
        questions: [
          { id: "q4", text: "Столица Франции?", difficulty: 100 },
          { id: "q5", text: "Самая длинная река?", difficulty: 130 },
          { id: "q6", text: "Сколько океанов?", difficulty: 160 },
          { id: "q11", text: "Высочайшая гора мира?", difficulty: 190 },
        ],
      },
      {
        name: "Наука",
        questions: [
          { id: "q7", text: "Формула воды?", difficulty: 100 },
          { id: "q8", text: "Скорость света?", difficulty: 140 },
          { id: "q9", text: "Какой газ мы вдыхаем?", difficulty: 170 },
          { id: "q12", text: "Температура кипения воды?", difficulty: 200 },
        ],
      },
    ],
    blitzTasks: [
      {
        id: "bt1",
        items: [
          { text: "Столица Японии", difficulty: 200 },
          { text: "Самая маленькая страна", difficulty: 250 },
          { text: "Река в Лондоне", difficulty: 300 },
        ],
      },
      {
        id: "bt2",
        items: [
          { text: "Формула соли", difficulty: 200 },
          { text: "Планета ближе всего к Солнцу", difficulty: 250 },
          { text: "Число Пи до 2 знаков", difficulty: 300 },
        ],
      },
    ],
  };
}

/**
 * История раундов для скриншотов с таблицей вопросов:
 * 1. Красные ответили на q2 (Животные, 120) — капитан Алексей
 * 2. Синие ответили на q6 (География, 160) — капитан Елена
 * 3. Красные ответили на q11 (География, 190) на 100% — капитан Дмитрий
 * 4. Синие ответили на q12 (Наука, 200) с джокером — капитан Ольга
 */
export function makeQuestionHistory() {
  return [
    {
      questionId: "q2",
      teamId: "red",
      score: 120,
      captainId: "Алексей",
      captainEmoji: "🦁",
      captainName: "Алексей",
      jokerUsed: false,
      allAnswered: false,
    },
    {
      questionId: "q6",
      teamId: "blue",
      score: 160,
      captainId: "Елена",
      captainEmoji: "🐬",
      captainName: "Елена",
      jokerUsed: false,
      allAnswered: false,
    },
    {
      questionId: "q11",
      teamId: "red",
      score: 190,
      captainId: "Дмитрий",
      captainEmoji: "🐯",
      captainName: "Дмитрий",
      jokerUsed: false,
      allAnswered: true,
    },
    {
      questionId: "q12",
      teamId: "blue",
      score: 400,
      captainId: "Ольга",
      captainEmoji: "🦊",
      captainName: "Ольга",
      jokerUsed: true,
      allAnswered: false,
    },
  ];
}

/** Использованные вопросы из стандартной истории */
export const USED_QUESTION_IDS = ["q2", "q6", "q11", "q12"];

/** Очки по командам из стандартной истории: red = 120+190, blue = 160+400 */
export const HISTORY_SCORES = { red: 310, blue: 560 };

/** Состояние джокеров из стандартной истории: синие использовали */
export const HISTORY_JOKER_USED = { red: false, blue: true };
export const HISTORY_JOKER_THIS_ROUND = { red: false, blue: false };

// ── Таблица вопросов для игрока (без текста) ─────────────────────────────────  

export function makePublicQuestionTable(used: string[] = []): PublicTopicRow[] {
  const qf = makeQuestionsFile();
  return qf.topics.map((t) => ({
    topicName: t.name,
    questions: t.questions.map((q) => ({
      id: q.id,
      difficulty: q.difficulty,
      used: used.includes(q.id),
    })),
  }));
}

// ── Блиц-задания ──────────────────────────────────────────────────────────────

export function makeBlitzTasksPublic(): BlitzTaskPublic[] {
  const qf = makeQuestionsFile();
  return (qf.blitzTasks ?? []).map((t) => ({
    id: t.id,
    items: t.items.map((i) => ({ text: i.text, difficulty: i.difficulty })),
    used: false,
  }));
}

export function makeBlitzItem(): BlitzItem {
  return { text: "Столица Японии", difficulty: 200 };
}

// ── Группы ответов для round-review / round-result ────────────────────────────

export function makeReviewGroups(
  playerNames: string[],
  correctCount: number,
  missedCount: number,
): AnswerGroup[] {
  const answered = playerNames.slice(0, playerNames.length - missedCount);
  const groups: AnswerGroup[] = [];

  // Правильные ответы — разделим на 2 группы (синонимы)
  const correctNames = answered.slice(0, correctCount);
  const half = Math.ceil(correctNames.length / 2);
  if (correctNames.length > 0) {
    groups.push({
      id: "g1",
      accepted: true,
      canonicalAnswer: "Гепард",
      playerIds: correctNames.slice(0, half),
      note: null,
    });
    if (correctNames.length > half) {
      groups.push({
        id: "g2",
        accepted: true,
        canonicalAnswer: "Леопард",
        playerIds: correctNames.slice(half),
        note: "Объединено как синоним",
      });
    }
  }

  // Неправильные ответы
  const wrongNames = answered.slice(correctCount);
  wrongNames.forEach((name, i) => {
    groups.push({
      id: `gw_${i}`,
      accepted: false,
      canonicalAnswer: ["Слон", "Лев", "Кот", "Черепаха"][i % 4],
      playerIds: [name],
      note: null,
    });
  });

  return groups;
}

// ── Результат раунда ──────────────────────────────────────────────────────────

export function makeRoundResult(
  playerNames: string[],
  correctCount: number,
  missedCount: number,
  joker = false,
): RoundResult {
  return {
    questionText: "Какое животное самое быстрое?",
    groups: makeReviewGroups(playerNames, correctCount, missedCount),
    score: correctCount * 100 * (joker ? 2 : 1),
    jokerApplied: joker,
  };
}

// ── PublicGameState ───────────────────────────────────────────────────────────

export function makePublicState(
  phase: GamePhase,
  overrides?: Partial<PublicGameState>,
): PublicGameState {
  return {
    phase,
    activeTeamId: "red",
    scores: { red: 0, blue: 0 },
    players: [],
    settings: { teamCount: 2, gameMode: "standard", hostType: "human" },
    jokerUsed: { red: false, blue: false },
    jokerActivatedThisRound: { red: false, blue: false },
    serverNow: Date.now(),
    ...overrides,
  };
}

// ── FullGameState ─────────────────────────────────────────────────────────────

export function makeFullState(
  phase: GamePhase,
  overrides?: Partial<FullGameState>,
): FullGameState {
  const qf = makeQuestionsFile();
  const base = makePublicState(phase, overrides) as FullGameState;
  return {
    ...base,
    questionTable: qf.topics.map((t) => t.questions),
    topicNames: qf.topics.map((t) => t.name),
    allAnswers: {},
    usedQuestionIds: [],
    settings: makeDefaultSettings(overrides?.settings),
    blitzTasks: qf.blitzTasks ?? [],
    usedBlitzTaskIds: [],
    lastCaptainByTeam: {},
    captainCountByPlayer: {},
    acceptedAnswerCountByPlayer: {},
    ...overrides,
  };
}

// ── Сокращения для частых комбинаций ──────────────────────────────────────────

export function timerAt(seconds: number) {
  return { endsAt: Date.now() + seconds * 1000 };
}
