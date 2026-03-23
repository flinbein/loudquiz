// ─── Questions & Constructor types ───────────────────────────────────────────

export interface QuestionsFile {
  topics: Topic[];
  blitzTasks?: BlitzTask[];
}

export interface Topic {
  name: string;
  questions: Question[];
}

export interface Question {
  id: string;
  text: string;
  difficulty: number;
  hint?: string;
  acceptedAnswers?: string[];
}

export interface BlitzItem {
  text: string;
  difficulty: number;
}

export interface BlitzTask {
  id: string;
  items: BlitzItem[];
}

// ─── Game state types ─────────────────────────────────────────────────────────

export type GamePhase =
  | "lobby"
  | "calibration"
  | "topic-suggest"
  | "question-setup"
  | RoundPhase
  | BlitzPhase
  | "finale";

export type RoundPhase =
  | "round-captain"
  | "round-ready"
  | "round-pick"
  | "round-active"
  | "round-answer"
  | "round-review"
  | "round-result";

export type BlitzPhase =
  | "blitz-captain"
  | "blitz-ready"
  | "blitz-pick"
  | "blitz-active"
  | "blitz-answer"
  | "blitz-result";

export interface PublicPlayerInfo {
  id: string;
  name: string;
  role: "player" | "spectator";
  teamId: string | null;
  emoji?: string;
  hasAnswered: boolean;
  isReady: boolean;
  wasRecentCaptain: boolean;
  online: boolean;
  blitzOrder?: number; // position in blitz sequence (1-based, 0 = captain)
}

export interface PublicTopicRow {
  topicName: string;
  questions: Array<{ id: string; difficulty: number; used: boolean }>;
}

export interface PublicRoundInfo {
  topicName: string;
  difficulty: number;
  questionId: string;
}

export interface RoundResult {
  questionText: string;
  groups: AnswerGroup[];
  score: number;
  jokerApplied: boolean;
  commentary?: string;
}

export interface AnswerGroup {
  id: string;
  accepted: boolean;
  canonicalAnswer: string;
  playerIds: string[];
  note?: string | null;
  rawAnswers?: Record<string, string>;
}

export interface GameStats {
  topAnswererName?: string;
  topAnswererCount?: number;
  topCaptainName?: string;
  topCaptainCount?: number;
}

export interface PublicSettings {
  teamCount: 1 | 2;
  gameMode: "standard" | "bonus" | "blitz";
  hostType: "human" | "ai";
}

export interface PublicGameState {
  phase: GamePhase;
  activeTeamId: string | null;
  scores: Record<string, number>;
  players: PublicPlayerInfo[];
  settings?: PublicSettings;
  timer?: { endsAt: number };
  currentRound?: PublicRoundInfo;
  questionRevealText?: string;
  roundResult?: RoundResult;
  jokerUsed: Record<string, boolean>;
  jokerActivatedThisRound: Record<string, boolean>;
  serverNow: number;
  captainId?: string | null;
  publicQuestionTable?: PublicTopicRow[];
  isAutoReviewing?: boolean;
  suggestions?: Array<{ playerName: string; text: string }>;
  topicSuggestEndsAt?: number;
  selectedTopics?: Array<{ name: string; reason: string }>;
  isGeneratingQuestions?: boolean;
  questionsReady?: boolean;
  blitzOrder?: string[];
  blitzTaskReveal?: { text: string; difficulty: number };
  gameStats?: GameStats;
  publicBlitzTasks?: Array<{ id: string; itemDifficulties: number[]; used: boolean; word?: string }>;
  questionHistory?: Array<{
    questionId: string;
    teamId: string;
    score: number;
    captainId?: string;
    captainEmoji?: string;
    captainName?: string;
    jokerUsed?: boolean;
    allAnswered?: boolean;
  }>;
}

export interface CaptainPrivateInfo {
  questionText: string;
}

export interface GameSettings {
  backendUrl: string;
  teamCount: 1 | 2;
  gameMode: "standard" | "bonus" | "blitz";
  hostType: "human" | "ai";
  aiApiKey?: string;
  roundDuration: number;
  answerDuration: number;
  questionsPerTopic: number;
  topicCount: number;
  blitzRoundCount?: number;
}

export interface FullGameState extends PublicGameState {
  questionTable: Question[][];
  topicNames: string[];
  allAnswers: Record<string, string>;
  usedQuestionIds: string[];
  currentQuestion?: Question;
  pickedTopicIdx?: number;
  pickedQuestionIdx?: number;
  settings: GameSettings;
  blitzTasks: BlitzTask[];
  usedBlitzTaskIds: string[];
  currentBlitzItem?: BlitzItem;
  pickedBlitzTaskId?: string;
  blitzStartedAt?: number;
  blitzTotalTimeMs?: number;
  blitzAnswers?: Record<string, string>;
  lastCaptainByTeam: Record<string, string>;
  captainCountByPlayer: Record<string, number>;
  acceptedAnswerCountByPlayer: Record<string, number>;
}
