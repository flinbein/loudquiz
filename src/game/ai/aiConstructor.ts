import type { Topic, Question, BlitzTask } from "../types";
import {
  TOPICS_SYSTEM_PROMPT,
  QUESTIONS_SYSTEM_PROMPT,
  BLITZ_SYSTEM_PROMPT,
  ANSWER_CHECK_SYSTEM_PROMPT,
  buildTopicsPrompt,
  buildQuestionsPrompt,
  buildBlitzPrompt,
  buildAnswerCheckPrompt,
  type TopicsInput,
  type QuestionsInput,
  type BlitzInput,
  type AnswerCheckInput,
} from "./prompts";

const MODEL = "google/gemini-2.0-flash-001";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`OpenRouter API: ${res.status} ${text}`);
  }
  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ от ИИ");
  return content;
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

export interface GeneratedTopic {
  name: string;
  reason: string;
}

export function parseTopicsResponse(raw: string): GeneratedTopic[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ИИ вернул невалидный JSON");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.topics)) throw new Error("Ответ не содержит поле 'topics'");
  return obj.topics.map((t: unknown, i: number) => {
    const topic = t as Record<string, unknown>;
    if (typeof topic.name !== "string" || !topic.name.trim())
      throw new Error(`topics[${i}].name отсутствует`);
    return {
      name: topic.name.trim(),
      reason: typeof topic.reason === "string" ? topic.reason.trim() : "",
    };
  });
}

export function parseQuestionsResponse(raw: string): Topic[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ИИ вернул невалидный JSON");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.topics)) throw new Error("Ответ не содержит поле 'topics'");
  return obj.topics.map((t: unknown, ti: number) => {
    const topic = t as Record<string, unknown>;
    if (typeof topic.name !== "string" || !topic.name.trim())
      throw new Error(`topics[${ti}].name отсутствует`);
    if (!Array.isArray(topic.questions)) throw new Error(`topics[${ti}].questions не массив`);
    const questions: Question[] = topic.questions.map((q: unknown, qi: number) => {
      const question = q as Record<string, unknown>;
      if (typeof question.text !== "string" || !question.text.trim())
        throw new Error(`topics[${ti}].questions[${qi}].text отсутствует`);
      const id =
        typeof question.id === "string" && question.id.trim()
          ? question.id.trim()
          : `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${qi}`;
      let difficulty = typeof question.difficulty === "number" ? question.difficulty : 100;
      if (difficulty < 100 || difficulty > 200 || difficulty % 10 !== 0) difficulty = 100;
      const result: Question = { id, text: question.text.trim(), difficulty };
      if (typeof question.hint === "string" && question.hint.trim())
        result.hint = question.hint.trim();
      if (Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length > 0)
        result.acceptedAnswers = question.acceptedAnswers.map(String);
      return result;
    });
    return { name: topic.name.trim(), questions };
  });
}

export function parseBlitzResponse(raw: string): BlitzTask[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ИИ вернул невалидный JSON");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.tasks)) throw new Error("Ответ не содержит поле 'tasks'");
  return obj.tasks.map((t: unknown, ti: number) => {
    const task = t as Record<string, unknown>;
    const id =
      typeof task.id === "string" && task.id.trim()
        ? task.id.trim()
        : `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${ti}`;
    if (!Array.isArray(task.items) || task.items.length === 0)
      throw new Error(`tasks[${ti}].items отсутствует или пуст`);
    const items = task.items.map((item: unknown, ii: number) => {
      const it = item as Record<string, unknown>;
      if (typeof it.text !== "string" || !it.text.trim())
        throw new Error(`tasks[${ti}].items[${ii}].text отсутствует`);
      let difficulty = typeof it.difficulty === "number" ? it.difficulty : 200;
      if (difficulty < 200 || difficulty > 400 || difficulty % 10 !== 0) difficulty = 200;
      return { text: it.text.trim(), difficulty };
    });
    return { id, items };
  });
}

export interface AnswerCheckGroup {
  id: string;
  accepted: boolean;
  canonicalAnswer: string;
  playerIds: string[];
  note?: string;
}

export interface AnswerCheckResult {
  groups: AnswerCheckGroup[];
  commentary: string;
}

export function parseAnswerCheckResponse(raw: string): AnswerCheckResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ИИ вернул невалидный JSON");
  }
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj.groups)) throw new Error("Ответ не содержит поле 'groups'");
  const groups: AnswerCheckGroup[] = obj.groups.map((g: unknown, i: number) => {
    const group = g as Record<string, unknown>;
    return {
      id: typeof group.id === "string" ? group.id : `g${i + 1}`,
      accepted: group.accepted === true,
      canonicalAnswer: typeof group.canonicalAnswer === "string" ? group.canonicalAnswer : "",
      playerIds: Array.isArray(group.playerIds) ? group.playerIds.map(String) : [],
      note: typeof group.note === "string" && group.note.trim() ? group.note.trim() : undefined,
    };
  });
  const commentary = typeof obj.commentary === "string" ? obj.commentary : "";
  return { groups, commentary };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateTopics(apiKey: string, input: TopicsInput): Promise<GeneratedTopic[]> {
  const raw = await callAI(apiKey, TOPICS_SYSTEM_PROMPT, buildTopicsPrompt(input));
  return parseTopicsResponse(raw);
}

export async function generateQuestions(apiKey: string, input: QuestionsInput): Promise<Topic[]> {
  const raw = await callAI(apiKey, QUESTIONS_SYSTEM_PROMPT, buildQuestionsPrompt(input));
  return parseQuestionsResponse(raw);
}

export async function generateBlitzTasks(apiKey: string, input: BlitzInput): Promise<BlitzTask[]> {
  const raw = await callAI(apiKey, BLITZ_SYSTEM_PROMPT, buildBlitzPrompt(input));
  return parseBlitzResponse(raw);
}

export async function checkAnswers(
  apiKey: string,
  input: AnswerCheckInput,
): Promise<AnswerCheckResult> {
  const raw = await callAI(apiKey, ANSWER_CHECK_SYSTEM_PROMPT, buildAnswerCheckPrompt(input));
  return parseAnswerCheckResponse(raw);
}
