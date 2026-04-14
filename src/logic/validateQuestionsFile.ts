import type { QuestionsFile } from "@/types/game";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: QuestionsFile;
}

export function validateQuestionsFile(input: unknown): ValidationResult {
  if (input == null || typeof input !== "object") {
    return { valid: false, error: "Not an object" };
  }

  const obj = input as Record<string, unknown>;

  if (!Array.isArray(obj.topics)) {
    return { valid: false, error: "Missing or invalid topics array" };
  }

  for (let i = 0; i < obj.topics.length; i++) {
    const topic = obj.topics[i] as Record<string, unknown>;
    if (typeof topic.name !== "string" || topic.name.trim() === "") {
      return { valid: false, error: `Topic ${i}: missing name` };
    }
    if (!Array.isArray(topic.questions)) {
      return { valid: false, error: `Topic ${i}: missing questions array` };
    }
    for (let j = 0; j < topic.questions.length; j++) {
      const q = topic.questions[j] as Record<string, unknown>;
      if (typeof q.text !== "string" || q.text.trim() === "") {
        return { valid: false, error: `Topic ${i}, Question ${j}: missing text` };
      }
      if (typeof q.difficulty !== "number" || q.difficulty < 100 || q.difficulty > 200) {
        return { valid: false, error: `Topic ${i}, Question ${j}: difficulty must be 100-200` };
      }
    }
  }

  const blitzTasks = Array.isArray(obj.blitzTasks) ? obj.blitzTasks : [];

  for (let i = 0; i < blitzTasks.length; i++) {
    const task = blitzTasks[i] as Record<string, unknown>;
    if (!Array.isArray(task.items)) {
      return { valid: false, error: `BlitzTask ${i}: missing items array` };
    }
    for (let j = 0; j < task.items.length; j++) {
      const item = task.items[j] as Record<string, unknown>;
      if (typeof item.text !== "string" || item.text.trim() === "") {
        return { valid: false, error: `BlitzTask ${i}, Item ${j}: missing text` };
      }
      if (typeof item.difficulty !== "number" || item.difficulty < 200 || item.difficulty > 400) {
        return { valid: false, error: `BlitzTask ${i}, Item ${j}: difficulty must be 200-400` };
      }
    }
  }

  const data: QuestionsFile = {
    topics: obj.topics.map((t: Record<string, unknown>) => ({
      name: (t.name as string).trim(),
      questions: (t.questions as Array<Record<string, unknown>>).map((q) => ({
        text: (q.text as string).trim(),
        difficulty: q.difficulty as number,
        acceptedAnswers: Array.isArray(q.acceptedAnswers)
          ? (q.acceptedAnswers as string[])
          : [],
      })),
    })),
    blitzTasks: blitzTasks.map((task: Record<string, unknown>) => ({
      items: (task.items as Array<Record<string, unknown>>).map((item) => ({
        text: (item.text as string).trim(),
        difficulty: item.difficulty as number,
      })),
    })),
  };

  return { valid: true, data };
}
