import type { QuestionsFile } from "@/types/game";

const KEYS = {
  apiKey: "loud-quiz-openrouter-api-key",
  playerName: "loud-quiz-player-name",
  calibration: "loud-quiz-calibration",
  usedQuestions: "loud-quiz-used-questions",
  constructorData: "loud-quiz-constructor-data",
  theme: "loud-quiz-theme",
  language: "loud-quiz-language",
} as const;

export interface CalibrationSettings {
  musicVolume: number;
  signalVolume: number;
  hapticEnabled: boolean;
  sharedHeadphones: boolean;
}

const defaultCalibration: CalibrationSettings = {
  musicVolume: 0.7,
  signalVolume: 0.8,
  hapticEnabled: true,
  sharedHeadphones: false,
};

// API Key

export function getApiKey(): string {
  return localStorage.getItem(KEYS.apiKey) ?? "";
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEYS.apiKey, key);
}

// Player name

export function getPlayerName(): string {
  try {
    const session = sessionStorage.getItem(KEYS.playerName);
    if (session) return session;
  } catch {
    // sessionStorage unavailable
  }
  return localStorage.getItem(KEYS.playerName) ?? "";
}

export function setPlayerName(name: string): void {
  localStorage.setItem(KEYS.playerName, name);
  try {
    sessionStorage.setItem(KEYS.playerName, name);
  } catch {
    // sessionStorage may be full or unavailable
  }
}

// Calibration

export function getCalibration(): CalibrationSettings {
  try {
    const raw = localStorage.getItem(KEYS.calibration);
    if (!raw) return { ...defaultCalibration };
    const parsed = JSON.parse(raw) as Partial<CalibrationSettings>;
    return { ...defaultCalibration, ...parsed };
  } catch {
    return { ...defaultCalibration };
  }
}

export function setCalibration(settings: CalibrationSettings): void {
  localStorage.setItem(KEYS.calibration, JSON.stringify(settings));
}

// Used questions (grouped by topic)

export function getUsedQuestionsByTopic(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(KEYS.usedQuestions);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Record<string, string[]>;
  } catch {
    return {};
  }
}

export function getUsedQuestionsTopics(): string[] {
  return Object.keys(getUsedQuestionsByTopic());
}

export function addUsedQuestion(topic: string, questionText: string): void {
  const all = getUsedQuestionsByTopic();
  const existing = all[topic] ?? [];
  if (existing.includes(questionText)) return;
  all[topic] = [...existing, questionText];
  localStorage.setItem(KEYS.usedQuestions, JSON.stringify(all));
}

export function setUsedQuestionsTopic(topic: string, questions: string[]): void {
  const all = getUsedQuestionsByTopic();
  all[topic] = questions;
  localStorage.setItem(KEYS.usedQuestions, JSON.stringify(all));
}

export function clearUsedQuestionsTopic(topic: string): void {
  const all = getUsedQuestionsByTopic();
  delete all[topic];
  localStorage.setItem(KEYS.usedQuestions, JSON.stringify(all));
}

export function clearUsedQuestions(): void {
  localStorage.removeItem(KEYS.usedQuestions);
}

// Constructor data (questions created in editor)

export function getConstructorData(): QuestionsFile | null {
  try {
    const raw = localStorage.getItem(KEYS.constructorData);
    if (!raw) return null;
    return JSON.parse(raw) as QuestionsFile;
  } catch {
    return null;
  }
}

export function setConstructorData(data: QuestionsFile): void {
  localStorage.setItem(KEYS.constructorData, JSON.stringify(data));
}

export function clearConstructorData(): void {
  localStorage.removeItem(KEYS.constructorData);
}

// Theme

export type Theme = "light" | "dark";

export function getTheme(): Theme | null {
  const value = localStorage.getItem(KEYS.theme);
  return value === "light" || value === "dark" ? value : null;
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(KEYS.theme, theme);
}

// Language

export function getLanguage(): string | null {
  return localStorage.getItem(KEYS.language);
}

export function setLanguage(lang: string): void {
  localStorage.setItem(KEYS.language, lang);
}
