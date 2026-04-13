import type {
  BlitzGenerationInput,
  BlitzGenerationResult,
} from "@/types/ai";
import { chatCompletionJSON } from "./client";
import { renderTemplate } from "./template";
import systemPrompt from "./blitzGeneration.system.md?raw";
import userPrompt from "./blitzGeneration.user.md?raw";

const SCHEMA = {
  name: "blitz_generation",
  schema: {
    type: "object",
    properties: {
      rounds: {
        type: "array",
        items: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  difficulty: { type: "number" },
                },
                required: ["text", "difficulty"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    },
    required: ["rounds"],
    additionalProperties: false,
  },
};

function formatList(items: string[]): string {
  if (items.length === 0) return "(none)";
  return items.map((t) => `- ${t}`).join("\n");
}

export async function generateBlitzTasks(
  apiKey: string,
  input: BlitzGenerationInput,
  language: string,
  model?: string,
): Promise<BlitzGenerationResult> {
  const system = renderTemplate(systemPrompt, {
    rounds: String(input.rounds),
    tasksPerRound: String(input.tasksPerRound),
    language,
  });

  const user = renderTemplate(userPrompt, {
    rounds: String(input.rounds),
    tasksPerRound: String(input.tasksPerRound),
    pastTasks: formatList(input.pastTasks),
  });

  return chatCompletionJSON<BlitzGenerationResult>({
    apiKey,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    schema: SCHEMA,
    model,
  });
}
