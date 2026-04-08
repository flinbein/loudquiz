// Game phase types

export type RoundPhase =
  | "round-captain"
  | "round-pick"
  | "round-ready"
  | "round-active"
  | "round-answer"
  | "round-review";

export type BlitzPhase =
  | "blitz-captain"
  | "blitz-pick"
  | "blitz-ready"
  | "blitz-active"
  | "blitz-answer"
  | "blitz-review";

export type GamePhase =
  | "lobby"
  | "topics-suggest"
  | RoundPhase
  | BlitzPhase
  | "finale";

// Game settings

export interface GameSettings {
  mode: "manual" | "ai";
  teamMode: "single" | "dual";
  topicCount: number;
  questionsPerTopic: number;
  blitzRoundsPerTeam: number;
  pastQuestions: string[];
}

// Players and teams

export type TeamId = "red" | "blue" | "none";

// Minimal player shape used by visual components (avatar + name + team)
export interface PlayerDisplay {
  emoji: string;
  name: string;
  team: TeamId;
}

export interface PlayerData extends PlayerDisplay{
  online: boolean;
  ready: boolean;
}

export interface TeamData {
  id: TeamId;
  score: number;
  jokerUsed: boolean;
}

// Questions and topics

export interface Question {
  text: string;
  difficulty: number;
  acceptedAnswers: string[];
}

export interface Topic {
  name: string;
  questions: Question[];
}

export interface BlitzItem {
  text: string;
  difficulty: number;
}

export interface BlitzTask {
  id: string;
  items: BlitzItem[];
}

export interface QuestionsFile {
  topics: Topic[];
  blitzTasks: BlitzTask[];
}

// Round state

export interface PlayerAnswer {
  text: string;
  timestamp: number;
}

export interface AnswerEvaluation {
  playerName: string;
  correct: boolean | null;  // null = not evaluated, true = correct, false = incorrect
  aiComment?: string;
}

export interface ReviewResult {
  evaluations: AnswerEvaluation[];
  groups: string[][];
  comment?: string;
  score: number;
  bonusMultiplier: number;
  scoreConfirmed: boolean;
  jokerApplied: boolean;
}

export interface RoundState {
  type: "round" | "blitz";
  teamId: TeamId;
  captainName: string;
  questionIndex?: number;
  blitzTaskId?: string;
  blitzItemIndex?: number;
  jokerActive: boolean;
  playerOrder?: string[];
  answers: Record<string, PlayerAnswer>;
  activeTimerStartedAt: number;
  bonusTime: number;
  reviewResult?: ReviewResult;
}

export interface RoundResult {
  type: "round" | "blitz";
  teamId: string;
  captainName: string;
  questionIndex?: number;
  blitzTaskId?: string;
  score: number;
  jokerUsed: boolean;
}

// Timer

export interface TimerState {
  startedAt: number;
  duration: number;
}

// Full game state

export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  players: PlayerData[];
  teams: TeamData[];
  topics: Topic[];
  blitzTasks: BlitzTask[];
  currentRound: RoundState | null;
  history: RoundResult[];
  timer: TimerState | null;
}
