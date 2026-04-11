import type { QuestionsFile } from "@/types/game";

const KEYS = {
  apiKey: "loud-quiz-openrouter-api-key",
  playerName: "loud-quiz-player-name",
  calibration: "loud-quiz-calibration",
  usedQuestions: "loud-quiz-used-questions",
  constructorData: "loud-quiz-constructor-data",
  theme: "loud-quiz-theme",
} as const;

export interface CalibrationSettings {
  musicVolume: number;
  signalVolume: number;
  hapticEnabled: boolean;
}

const defaultCalibration: CalibrationSettings = {
  musicVolume: 0.7,
  signalVolume: 0.8,
  hapticEnabled: true,
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
  return localStorage.getItem(KEYS.playerName) ?? "";
}

export function setPlayerName(name: string): void {
  localStorage.setItem(KEYS.playerName, name);
}

// Calibration

export function getCalibration(): CalibrationSettings {
  try {
    const raw = localStorage.getItem(KEYS.calibration);
    if (!raw) return { ...defaultCalibration };
    return JSON.parse(raw) as CalibrationSettings;
  } catch {
    return { ...defaultCalibration };
  }
}

export function setCalibration(settings: CalibrationSettings): void {
  localStorage.setItem(KEYS.calibration, JSON.stringify(settings));
}

// Used questions

export function getUsedQuestions(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.usedQuestions);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function addUsedQuestions(questions: string[]): void {
  const existing = getUsedQuestions();
  const merged = [...new Set([...existing, ...questions])];
  localStorage.setItem(KEYS.usedQuestions, JSON.stringify(merged));
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
