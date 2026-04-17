// Game phase types

export type RoundPhase =
  | "round-captain"
  | "round-pick"
  | "round-ready"
  | "round-active"
  | "round-answer"
  | "round-review"
  | "round-result";

export type BlitzPhase =
  | "blitz-captain"
  | "blitz-pick"
  | "blitz-ready"
  | "blitz-active"
  | "blitz-answer"
  | "blitz-review";

export type GamePhase =
  | "lobby"
  | "topics-collecting"
  | "topics-generating"
  | "topics-preview"
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
  bonusTimeMultiplier: number;
  bonusTimeApplied: boolean;
  bonusTime: number;
  jokerApplied: boolean;
  aiStatus: "idle" | "loading" | "done" | "error" | "manual";
  aiError?: string;
}

export interface RoundState {
  type: "round" | "blitz";
  teamId: TeamId;
  captainName: string;
  questionIndex?: number;
  blitzTaskIndex?: number;
  blitzItemIndex?: number;
  jokerActive: boolean;
  playerOrder?: string[];
  answers: Record<string, PlayerAnswer>;
  activeTimerStartedAt: number;
  bonusTime: number;
  reviewResult?: ReviewResult;
}

export interface PlayerRoundResult {
  playerName: string;
  answerText: string;       // "" if player did not answer
  correct: boolean | null;  // true/false/null (not evaluated)
  answerTime: number;       // ms from timer start (Infinity if no answer)
  groupIndex: number;       // index in groups[] (-1 if not in a group)
}

export interface RoundResult {
  type: "round" | "blitz";
  teamId: TeamId;
  captainName: string;
  questionIndex?: number;
  blitzTaskIndex?: number;
  score: number;
  jokerUsed: boolean;
  // new fields for nominations
  playerResults: PlayerRoundResult[];
  difficulty: number;
  topicIndex: number;          // -1 for blitz
  bonusTimeApplied: boolean;
  bonusTime: number;
  bonusTimeMultiplier: number;
  groups: string[][];
}

// Timer

export interface TimerState {
  startedAt: number;
  duration: number;
}

export interface TopicsSuggestState {
  suggestions: Record<string, string[]>;
  noIdeas: string[];
  timerEndsAt: number | null;
  manualTopics: string[] | null;
  generationStep: "topics" | "questions" | "blitz" | "done" | null;
  aiError: { step: "topics" | "questions" | "blitz"; message: string } | null;
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
  topicsSuggest?: TopicsSuggestState;
}
