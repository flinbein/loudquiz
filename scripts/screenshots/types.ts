import type {
  FullGameState,
  PublicGameState,
  QuestionsFile,
  AnswerGroup,
  GameSettings,
  CaptainPrivateInfo,
  BlitzItem,
} from "../../src/game/types";
import type { BlitzTaskPublic } from "../../src/game/messages";
import type { Page } from "puppeteer";

export interface MockHostState {
  gameState: FullGameState;
  questionsPreview?: QuestionsFile;
  reviewGroups?: AnswerGroup[];
  settings: GameSettings;
}

export interface MockPlayerState {
  gameState: PublicGameState;
  playerName: string;
  localRole: "player" | "spectator";
  captainInfo?: CaptainPrivateInfo;
  blitzCaptainItem?: BlitzItem;
  answerSent?: boolean;
  blitzAnswerSent?: boolean;
  readySent?: boolean;
  blitzTaskList?: BlitzTaskPublic[];
}

export interface ScreenshotScenario {
  /** Уникальное имя сценария (без .png, без темы) */
  name: string;
  /** Тип экрана: определяет viewport и URL */
  view: "host" | "player" | "home";
  /** Мок-состояние для host-страницы */
  mockHost?: MockHostState;
  /** Мок-состояние для player-страницы */
  mockPlayer?: MockPlayerState;
  /** Действия перед скриншотом (клики, скролл и т.п.) */
  beforeScreenshot?: (page: Page) => Promise<void>;
}

// Реэкспорт типов для удобства в сценариях
export type {
  FullGameState,
  PublicGameState,
  QuestionsFile,
  AnswerGroup,
  GameSettings,
  CaptainPrivateInfo,
  BlitzItem,
  BlitzTaskPublic,
};
