import type { QuestionsFile, Question, BlitzItem, BlitzTask, Topic } from "../../game/types";

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export function validateQuestion(q: Partial<Question>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!q.text || q.text.trim() === "") {
    errors.push({ field: "text", message: "Текст вопроса не может быть пустым" });
  }
  if (
    q.difficulty === undefined ||
    q.difficulty < 100 ||
    q.difficulty > 200 ||
    q.difficulty % 10 !== 0
  ) {
    errors.push({ field: "difficulty", message: "Сложность: 100–200, кратно 10" });
  }
  return errors;
}

export function validateBlitzItem(item: Partial<BlitzItem>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!item.text || item.text.trim() === "") {
    errors.push({ field: "text", message: "Текст не может быть пустым" });
  }
  if (
    item.difficulty === undefined ||
    item.difficulty < 200 ||
    item.difficulty > 400 ||
    item.difficulty % 10 !== 0
  ) {
    errors.push({ field: "difficulty", message: "Сложность: 200–400, кратно 10" });
  }
  return errors;
}

export function validateBlitzTask(t: Partial<BlitzTask>): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!Array.isArray(t.items) || t.items.length === 0) {
    errors.push({ field: "items", message: "Задание должно содержать хотя бы один вариант" });
  }
  return errors;
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  data: QuestionsFile;
  warnings: string[];
}

export function importJson(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Невалидный JSON");
  }

  if (typeof parsed !== "object" || parsed === null || !("topics" in parsed)) {
    throw new Error("JSON должен содержать поле 'topics'");
  }

  const obj = parsed as Record<string, unknown>;
  const warnings: string[] = [];

  if (!Array.isArray(obj.topics)) {
    throw new Error("'topics' должен быть массивом");
  }

  const topics: Topic[] = obj.topics.map((t: unknown, ti: number) => {
    if (typeof t !== "object" || t === null) throw new Error(`topics[${ti}]: ожидается объект`);
    const topic = t as Record<string, unknown>;
    if (typeof topic.name !== "string" || topic.name.trim() === "") {
      throw new Error(`topics[${ti}].name: ожидается непустая строка`);
    }
    if (!Array.isArray(topic.questions)) {
      throw new Error(`topics[${ti}].questions: ожидается массив`);
    }
    const questions: Question[] = topic.questions.map((q: unknown, qi: number) => {
      if (typeof q !== "object" || q === null)
        throw new Error(`topics[${ti}].questions[${qi}]: ожидается объект`);
      const question = q as Record<string, unknown>;
      if (typeof question.id !== "string") {
        warnings.push(`topics[${ti}].questions[${qi}].id отсутствует, сгенерирован автоматически`);
        question.id = crypto.randomUUID();
      }
      if (typeof question.text !== "string" || question.text.trim() === "") {
        throw new Error(`topics[${ti}].questions[${qi}].text: ожидается непустая строка`);
      }
      if (
        typeof question.difficulty !== "number" ||
        question.difficulty < 100 ||
        question.difficulty > 200 ||
        question.difficulty % 10 !== 0
      ) {
        warnings.push(
          `topics[${ti}].questions[${qi}].difficulty некорректно (${question.difficulty}), установлено 100`,
        );
        question.difficulty = 100;
      }
      return {
        id: question.id as string,
        text: question.text as string,
        difficulty: question.difficulty as number,
        ...(typeof question.hint === "string" ? { hint: question.hint } : {}),
        ...(Array.isArray(question.acceptedAnswers)
          ? { acceptedAnswers: question.acceptedAnswers as string[] }
          : {}),
      };
    });
    return { name: topic.name as string, questions };
  });

  let blitzTasks: BlitzTask[] | undefined;
  if (Array.isArray(obj.blitzTasks)) {
    blitzTasks = obj.blitzTasks.map((t: unknown, ti: number) => {
      if (typeof t !== "object" || t === null)
        throw new Error(`blitzTasks[${ti}]: ожидается объект`);
      const task = t as Record<string, unknown>;
      if (typeof task.id !== "string") {
        warnings.push(`blitzTasks[${ti}].id отсутствует, сгенерирован автоматически`);
        task.id = crypto.randomUUID();
      }
      if (!Array.isArray(task.items) || task.items.length === 0) {
        throw new Error(`blitzTasks[${ti}].items: ожидается непустой массив`);
      }
      const items: BlitzItem[] = (task.items as unknown[]).map((item: unknown, ii: number) => {
        if (typeof item !== "object" || item === null)
          throw new Error(`blitzTasks[${ti}].items[${ii}]: ожидается объект`);
        const it = item as Record<string, unknown>;
        if (typeof it.text !== "string" || it.text.trim() === "") {
          throw new Error(`blitzTasks[${ti}].items[${ii}].text: ожидается непустая строка`);
        }
        if (
          typeof it.difficulty !== "number" ||
          it.difficulty < 200 ||
          it.difficulty > 400 ||
          it.difficulty % 10 !== 0
        ) {
          warnings.push(
            `blitzTasks[${ti}].items[${ii}].difficulty некорректно (${it.difficulty}), установлено 200`,
          );
          it.difficulty = 200;
        }
        return { text: it.text as string, difficulty: it.difficulty as number };
      });
      return { id: task.id as string, items };
    });
  }

  return { data: { topics, ...(blitzTasks ? { blitzTasks } : {}) }, warnings };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function exportJson(data: QuestionsFile): string {
  return JSON.stringify(data, null, 2);
}

export function downloadJson(data: QuestionsFile, filename = "questions.json"): void {
  const blob = new Blob([exportJson(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── ID generation ────────────────────────────────────────────────────────────

export function newQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function newBlitzId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Empty factories ──────────────────────────────────────────────────────────

export function emptyQuestion(): Question {
  return { id: newQuestionId(), text: "", difficulty: 100 };
}

export function emptyBlitzItem(): BlitzItem {
  return { text: "", difficulty: 200 };
}

export function emptyBlitzTask(): BlitzTask {
  return { id: newBlitzId(), items: [emptyBlitzItem()] };
}

export function emptyTopic(): Topic {
  return { name: "", questions: [emptyQuestion()] };
}

export function emptyQuestionsFile(): QuestionsFile {
  return { topics: [emptyTopic()], blitzTasks: [] };
}
