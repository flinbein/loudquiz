import type { AIMessage, AIRequest } from "@/types/ai";
import { AINetworkError, AIParseError } from "@/types/ai";

const DEFAULT_MODEL = "google/gemini-2.0-flash-001";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_RETRIES = 3;

export interface ChatCompletionOptions {
  apiKey: string;
  messages: AIMessage[];
  schema: { name: string; schema: Record<string, unknown> };
  model?: string;
}

export async function chatCompletionJSON<T>(
  options: ChatCompletionOptions,
): Promise<T> {
  const { apiKey, messages, schema, model = DEFAULT_MODEL } = options;

  const body: AIRequest = {
    model,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schema.name,
        strict: true,
        schema: schema.schema,
      },
    },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let response: Response;
    try {
      response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      throw new AINetworkError(
        error instanceof Error ? error.message : "Network request failed",
      );
    }

    if (!response.ok) {
      const text = await response.text();
      throw new AINetworkError(
        `HTTP ${response.status}`,
        response.status,
        text,
      );
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      return JSON.parse(content) as T;
    } catch {
      if (attempt === MAX_RETRIES - 1) {
        throw new AIParseError(
          `Invalid JSON after ${MAX_RETRIES} attempts`,
          content,
        );
      }
    }
  }

  throw new AIParseError("Unreachable");
}
