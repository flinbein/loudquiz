import type {
  QuestionGenerationInput,
  QuestionGenerationResult,
} from "@/types/ai";
import { chatCompletionJSON } from "./client";
import { renderTemplate } from "./template";
import systemPrompt from "./questionGeneration.system.md?raw";
import userPrompt from "./questionGeneration.user.md?raw";

const SCHEMA = {
  name: "question_generation",
  schema: {
    type: "object",
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  difficulty: { type: "number" },
                  acceptedAnswers: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["text", "difficulty", "acceptedAnswers"],
                additionalProperties: false,
              },
            },
          },
          required: ["name", "questions"],
          additionalProperties: false,
        },
      },
    },
    required: ["topics"],
    additionalProperties: false,
  },
};

function formatList(items: string[]): string {
  if (items.length === 0) return "(none)";
  return items.map((t) => `- ${t}`).join("\n");
}

export async function generateQuestions(
  apiKey: string,
  input: QuestionGenerationInput,
  language: string,
  model?: string,
): Promise<QuestionGenerationResult> {
  const system = renderTemplate(systemPrompt, {
    questionsPerTopic: String(input.questionsPerTopic),
    playersPerTeam: String(input.playersPerTeam),
    language,
  });

  const user = renderTemplate(userPrompt, {
    topics: formatList(input.topics),
    questionsPerTopic: String(input.questionsPerTopic),
    playersPerTeam: String(input.playersPerTeam),
    pastQuestions: formatList(input.pastQuestions),
  });

  return chatCompletionJSON<QuestionGenerationResult>({
    apiKey,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    schema: SCHEMA,
    model,
  });
}
