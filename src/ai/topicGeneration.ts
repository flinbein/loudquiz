import type { TopicGenerationInput, TopicGenerationResult } from "@/types/ai";
import { chatCompletionJSON } from "./client";
import { renderTemplate } from "./template";
import systemPrompt from "./topicGeneration.system.md?raw";
import userPrompt from "./topicGeneration.user.md?raw";

const SCHEMA = {
  name: "topic_generation",
  schema: {
    type: "object",
    properties: {
      topics: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            reason: { type: "string" },
          },
          required: ["name", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["topics"],
    additionalProperties: false,
  },
};

function formatSuggestions(
  suggestions: TopicGenerationInput["suggestions"],
): string {
  if (suggestions.length === 0) return "(none)";
  return suggestions
    .map((s) => `- ${s.playerName}: ${s.text}`)
    .join("\n");
}

function formatList(items: string[]): string {
  if (items.length === 0) return "(none)";
  return items.map((t) => `- ${t}`).join("\n");
}

export async function generateTopics(
  apiKey: string,
  input: TopicGenerationInput,
  language: string,
  model?: string,
): Promise<TopicGenerationResult> {
  const system = renderTemplate(systemPrompt, {
    topicCount: String(input.topicCount),
    language,
  });

  const user = renderTemplate(userPrompt, {
    suggestions: formatSuggestions(input.suggestions),
    topicCount: String(input.topicCount),
    pastTopics: formatList(input.pastTopics),
  });

  return chatCompletionJSON<TopicGenerationResult>({
    apiKey,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    schema: SCHEMA,
    model,
  });
}
