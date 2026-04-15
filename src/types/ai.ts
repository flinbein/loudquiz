// OpenRouter API types

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  model: string;
  messages: AIMessage[];
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: Record<string, unknown>;
    };
  };
}

export interface AIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Topic generation

export interface TopicGenerationInput {
  suggestions: Array<{
    playerName: string;
    text: string;
  }>;
  topicCount: number;
  pastTopics: string[];
}

export interface TopicGenerationResult {
  topics: Array<{
    name: string;
    reason: string;
  }>;
}

// Question generation

export interface QuestionGenerationInput {
  topics: string[];
  questionsPerTopic: number;
  playersPerTeam: number;
  pastQuestions: string[];
}

export interface QuestionGenerationResult {
  topics: Array<{
    name: string;
    questions: Array<{
      text: string;
      difficulty: number;
      acceptedAnswers: string[];
    }>;
  }>;
}

// Blitz generation

export interface BlitzGenerationInput {
  rounds: number;
  tasksPerRound: number;
  pastTasks: string[];
}

export interface BlitzGenerationResult {
  rounds: Array<{
    items: Array<{
      text: string;
      difficulty: number;
    }>;
  }>;
}

// Answer check

export interface AnswerCheckInput {
  captainName: string;
  question: string;
  answers: Array<{
    playerName: string;
    answer: string;
  }>;
}

export interface AnswerCheckResult {
  results: Array<{
    playerName: string;
    accepted: boolean;
    group: number | null;
    note: string | null;
  }>;
  comment: string;
}

// AI errors

export class AINetworkError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "AINetworkError";
  }
}

export class AIParseError extends Error {
  constructor(
    message: string,
    public readonly lastContent?: string,
  ) {
    super(message);
    this.name = "AIParseError";
  }
}
