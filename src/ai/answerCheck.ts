import type { AnswerCheckInput, AnswerCheckResult } from "@/types/ai";
import { chatCompletionJSON } from "./client";
import { renderTemplate } from "./template";
import systemPrompt from "./answerCheck.system.md?raw";
import userPrompt from "./answerCheck.user.md?raw";

const SCHEMA = {
  name: "answer_check",
  schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            playerName: { type: "string" },
            accepted: { type: "boolean" },
            group: { type: ["number", "null"] },
            note: { type: ["string", "null"] },
          },
          required: ["playerName", "accepted", "group", "note"],
          additionalProperties: false,
        },
      },
      comment: { type: "string" },
    },
    required: ["results", "comment"],
    additionalProperties: false,
  },
};

function formatAnswers(answers: AnswerCheckInput["answers"]): string {
  return JSON.stringify(answers, null, 2);
}

export async function checkAnswers(
  apiKey: string,
  input: AnswerCheckInput,
  language: string,
  model?: string,
): Promise<AnswerCheckResult> {
  const system = renderTemplate(systemPrompt, {
    language,
    captainName: input.captainName,
  });

  const user = renderTemplate(userPrompt, {
    question: input.question,
    answers: formatAnswers(input.answers),
  });

  return chatCompletionJSON<AnswerCheckResult>({
    apiKey,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    schema: SCHEMA,
    model,
  });
}
