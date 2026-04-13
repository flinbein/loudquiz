# Phase 8.1: AI Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pure AI client module wrapping OpenRouter API for topic/question/blitz generation and answer checking.

**Architecture:** `src/ai/client.ts` provides a generic `chatCompletionJSON<T>()` that handles fetch, JSON parsing, and retry. Four thin modules (`topicGeneration`, `questionGeneration`, `blitzGeneration`, `answerCheck`) compose prompts from `.md` templates and call the client. All functions are pure — API key and language passed as parameters.

**Tech Stack:** TypeScript, Vite (`?raw` imports for `.md`), Vitest, `fetch` API.

---

## File Map

| File | Responsibility |
|---|---|
| `src/types/ai.ts` | Add `AINetworkError`, `AIParseError` classes |
| `src/vite-env.d.ts` | Add `*.md?raw` type declaration |
| `src/ai/template.ts` | `renderTemplate()` — `{{var}}` replacement |
| `src/ai/template.test.ts` | Tests for `renderTemplate` |
| `src/ai/client.ts` | `chatCompletionJSON<T>()` — OpenRouter wrapper |
| `src/ai/client.test.ts` | Tests for client (mock fetch) |
| `src/ai/topicGeneration.ts` | `generateTopics()` |
| `src/ai/topicGeneration.system.md` | System prompt |
| `src/ai/topicGeneration.user.md` | User prompt template |
| `src/ai/topicGeneration.test.ts` | Tests for topic generation |
| `src/ai/questionGeneration.ts` | `generateQuestions()` |
| `src/ai/questionGeneration.system.md` | System prompt |
| `src/ai/questionGeneration.user.md` | User prompt template |
| `src/ai/questionGeneration.test.ts` | Tests for question generation |
| `src/ai/blitzGeneration.ts` | `generateBlitzTasks()` |
| `src/ai/blitzGeneration.system.md` | System prompt |
| `src/ai/blitzGeneration.user.md` | User prompt template |
| `src/ai/blitzGeneration.test.ts` | Tests for blitz generation |
| `src/ai/answerCheck.ts` | `checkAnswers()` |
| `src/ai/answerCheck.system.md` | System prompt |
| `src/ai/answerCheck.user.md` | User prompt template |
| `src/ai/answerCheck.test.ts` | Tests for answer checking |

---

### Task 1: Error types + Vite declaration

**Files:**
- Modify: `src/types/ai.ts`
- Modify: `src/vite-env.d.ts`

- [ ] **Step 1: Add error classes to `src/types/ai.ts`**

Append to the end of `src/types/ai.ts`:

```typescript
// AI errors

export class AINetworkError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "AINetworkError";
  }
}

export class AIParseError extends Error {
  constructor(
    message: string,
    public readonly lastContent?: string,
  ) {
    super(message);
    this.name = "AIParseError";
  }
}
```

- [ ] **Step 2: Add `*.md?raw` declaration to `src/vite-env.d.ts`**

Replace contents of `src/vite-env.d.ts` with:

```typescript
/// <reference types="vite/client" />

declare module "*.md?raw" {
  const content: string;
  export default content;
}
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/ai.ts src/vite-env.d.ts
git commit -m "feat(ai): add AINetworkError, AIParseError and md?raw declaration"
```

---

### Task 2: Template renderer

**Files:**
- Create: `src/ai/template.ts`
- Create: `src/ai/template.test.ts`

- [ ] **Step 1: Write failing tests for `renderTemplate`**

Create `src/ai/template.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { renderTemplate } from "./template";

describe("renderTemplate", () => {
  it("replaces a single variable", () => {
    expect(renderTemplate("Hello {{name}}!", { name: "World" }))
      .toBe("Hello World!");
  });

  it("replaces multiple different variables", () => {
    expect(renderTemplate("{{a}} and {{b}}", { a: "1", b: "2" }))
      .toBe("1 and 2");
  });

  it("replaces multiple occurrences of the same variable", () => {
    expect(renderTemplate("{{x}} + {{x}}", { x: "y" }))
      .toBe("y + y");
  });

  it("leaves unknown variables as-is", () => {
    expect(renderTemplate("{{known}} {{unknown}}", { known: "yes" }))
      .toBe("yes {{unknown}}");
  });

  it("returns template unchanged when vars is empty", () => {
    expect(renderTemplate("no {{vars}} here", {}))
      .toBe("no {{vars}} here");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ai/template.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `renderTemplate`**

Create `src/ai/template.ts`:

```typescript
export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    Object.hasOwn(vars, key) ? vars[key] : match,
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ai/template.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ai/template.ts src/ai/template.test.ts
git commit -m "feat(ai): add template renderer with {{var}} substitution"
```

---

### Task 3: AI client

**Files:**
- Create: `src/ai/client.ts`
- Create: `src/ai/client.test.ts`

- [ ] **Step 1: Write failing tests for `chatCompletionJSON`**

Create `src/ai/client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { chatCompletionJSON } from "./client";
import { AINetworkError, AIParseError } from "@/types/ai";

const SCHEMA = { name: "test", schema: { type: "object", properties: { x: { type: "number" } }, required: ["x"], additionalProperties: false } };
const API_KEY = "test-key";
const MESSAGES = [{ role: "user" as const, content: "hi" }];

function mockFetchResponse(content: string, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: () => Promise.resolve(ok ? "" : content),
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
    }),
  });
}

describe("chatCompletionJSON", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed JSON on success", async () => {
    global.fetch = mockFetchResponse('{"x":42}');

    const result = await chatCompletionJSON<{ x: number }>({
      apiKey: API_KEY,
      messages: MESSAGES,
      schema: SCHEMA,
    });

    expect(result).toEqual({ x: 42 });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("sends correct headers and body", async () => {
    global.fetch = mockFetchResponse('{"x":1}');

    await chatCompletionJSON<{ x: number }>({
      apiKey: API_KEY,
      messages: MESSAGES,
      schema: SCHEMA,
      model: "custom/model",
    });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = init!.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer test-key");
    expect(headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init!.body as string);
    expect(body.model).toBe("custom/model");
    expect(body.messages).toEqual(MESSAGES);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.name).toBe("test");
    expect(body.response_format.json_schema.strict).toBe(true);
  });

  it("uses default model when not specified", async () => {
    global.fetch = mockFetchResponse('{"x":1}');

    await chatCompletionJSON<{ x: number }>({
      apiKey: API_KEY,
      messages: MESSAGES,
      schema: SCHEMA,
    });

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(body.model).toBe("google/gemini-2.0-flash-001");
  });

  it("retries on invalid JSON and succeeds", async () => {
    let call = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      call++;
      const content = call < 3 ? "not json" : '{"x":99}';
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ choices: [{ message: { content } }] }),
      });
    });

    const result = await chatCompletionJSON<{ x: number }>({
      apiKey: API_KEY,
      messages: MESSAGES,
      schema: SCHEMA,
    });

    expect(result).toEqual({ x: 99 });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("throws AIParseError after exhausting retries", async () => {
    global.fetch = mockFetchResponse("not json");

    await expect(
      chatCompletionJSON({ apiKey: API_KEY, messages: MESSAGES, schema: SCHEMA }),
    ).rejects.toThrow(AIParseError);

    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("throws AINetworkError on non-ok status without retry", async () => {
    global.fetch = mockFetchResponse("Unauthorized", false, 401);

    await expect(
      chatCompletionJSON({ apiKey: API_KEY, messages: MESSAGES, schema: SCHEMA }),
    ).rejects.toThrow(AINetworkError);

    expect(fetch).toHaveBeenCalledOnce();
  });

  it("throws AINetworkError on fetch rejection without retry", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      chatCompletionJSON({ apiKey: API_KEY, messages: MESSAGES, schema: SCHEMA }),
    ).rejects.toThrow(AINetworkError);

    expect(fetch).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ai/client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `chatCompletionJSON`**

Create `src/ai/client.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ai/client.test.ts`
Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ai/client.ts src/ai/client.test.ts
git commit -m "feat(ai): add chatCompletionJSON with retry and error handling"
```

---

### Task 4: Topic generation module

**Files:**
- Create: `src/ai/topicGeneration.ts`
- Create: `src/ai/topicGeneration.system.md`
- Create: `src/ai/topicGeneration.user.md`
- Create: `src/ai/topicGeneration.test.ts`

- [ ] **Step 1: Write system prompt**

Create `src/ai/topicGeneration.system.md`:

```markdown
You are a quiz host selecting topics for a party quiz game.

Your task is to choose {{topicCount}} topics based on player suggestions.

Rules:
- Respect majority preferences — topics suggested by more players are preferred.
- Ignore nonsensical, offensive, or incomprehensible suggestions.
- Avoid overly specialized topics (quantum physics, molecular biology, etc.) — topics should be accessible to a general audience.
- Do not repeat any topic from the "past topics" list.
- If there are not enough good suggestions, propose your own creative topics.
- For each chosen topic, write a brief reason explaining why it was selected.

Respond in {{language}}. All topic names and reasons must be in {{language}}.
```

- [ ] **Step 2: Write user prompt template**

Create `src/ai/topicGeneration.user.md`:

```markdown
Player suggestions:
{{suggestions}}

Number of topics to select: {{topicCount}}

Past topics (do not repeat):
{{pastTopics}}
```

- [ ] **Step 3: Write failing tests**

Create `src/ai/topicGeneration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TopicGenerationInput } from "@/types/ai";

vi.mock("./client", () => ({
  chatCompletionJSON: vi.fn(),
}));

import { generateTopics } from "./topicGeneration";
import { chatCompletionJSON } from "./client";

const mockChat = vi.mocked(chatCompletionJSON);

const INPUT: TopicGenerationInput = {
  suggestions: [
    { playerName: "Alice", text: "Movies" },
    { playerName: "Bob", text: "Science" },
  ],
  topicCount: 2,
  pastTopics: ["History"],
};

describe("generateTopics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      topics: [
        { name: "Movies", reason: "Popular choice" },
        { name: "Science", reason: "Educational" },
      ],
    });
  });

  it("calls chatCompletionJSON with rendered prompts", async () => {
    await generateTopics("key", INPUT, "ru");

    expect(mockChat).toHaveBeenCalledOnce();
    const opts = mockChat.mock.calls[0][0];
    expect(opts.apiKey).toBe("key");
    expect(opts.messages).toHaveLength(2);
    expect(opts.messages[0].role).toBe("system");
    expect(opts.messages[0].content).toContain("2 topics");
    expect(opts.messages[0].content).toContain("ru");
    expect(opts.messages[1].role).toBe("user");
    expect(opts.messages[1].content).toContain("Alice");
    expect(opts.messages[1].content).toContain("Movies");
    expect(opts.messages[1].content).toContain("History");
    expect(opts.schema.name).toBe("topic_generation");
  });

  it("forwards model option", async () => {
    await generateTopics("key", INPUT, "en", "custom/model");

    const opts = mockChat.mock.calls[0][0];
    expect(opts.model).toBe("custom/model");
  });

  it("returns chatCompletionJSON result", async () => {
    const result = await generateTopics("key", INPUT, "ru");

    expect(result.topics).toHaveLength(2);
    expect(result.topics[0].name).toBe("Movies");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/ai/topicGeneration.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `generateTopics`**

Create `src/ai/topicGeneration.ts`:

```typescript
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/ai/topicGeneration.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ai/topicGeneration.ts src/ai/topicGeneration.system.md src/ai/topicGeneration.user.md src/ai/topicGeneration.test.ts
git commit -m "feat(ai): add topic generation module with prompts"
```

---

### Task 5: Question generation module

**Files:**
- Create: `src/ai/questionGeneration.ts`
- Create: `src/ai/questionGeneration.system.md`
- Create: `src/ai/questionGeneration.user.md`
- Create: `src/ai/questionGeneration.test.ts`

- [ ] **Step 1: Write system prompt**

Create `src/ai/questionGeneration.system.md`:

```markdown
You are a question author for a party quiz game where players wear headphones and cannot hear each other. The captain explains each question to teammates using only gestures and facial expressions — no sound, no writing, no pointing at objects.

Your task is to generate {{questionsPerTopic}} questions for each given topic.

Rules:
- Each question must have at least {{playersPerTeam}} unique valid answers. Synonyms do not count as unique.
- Answers must be verifiable — factual, specific, and unambiguous.
- Difficulty ranges from 100 to 200, in steps of 10. Distribute difficulty roughly evenly across questions.
- Difficulty reflects how hard it is to convey the concept through gestures alone. Abstract or complex ideas are harder.
- You may use exclusion conditions ("Name a fruit that is NOT red") and wordplay to increase difficulty.
- Do not repeat questions from the "past questions" list.
- For each question, provide {{playersPerTeam}} example valid answers in `acceptedAnswers`.

Respond in {{language}}. All questions and answers must be in {{language}}.
```

- [ ] **Step 2: Write user prompt template**

Create `src/ai/questionGeneration.user.md`:

```markdown
Topics:
{{topics}}

Questions per topic: {{questionsPerTopic}}
Players per team: {{playersPerTeam}}

Past questions (do not repeat):
{{pastQuestions}}
```

- [ ] **Step 3: Write failing tests**

Create `src/ai/questionGeneration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QuestionGenerationInput } from "@/types/ai";

vi.mock("./client", () => ({
  chatCompletionJSON: vi.fn(),
}));

import { generateQuestions } from "./questionGeneration";
import { chatCompletionJSON } from "./client";

const mockChat = vi.mocked(chatCompletionJSON);

const INPUT: QuestionGenerationInput = {
  topics: ["Movies", "Science"],
  questionsPerTopic: 3,
  playersPerTeam: 4,
  pastQuestions: ["Old question"],
};

describe("generateQuestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      topics: [
        {
          name: "Movies",
          questions: [
            { text: "Q1", difficulty: 100, acceptedAnswers: ["a", "b", "c", "d"] },
          ],
        },
      ],
    });
  });

  it("calls chatCompletionJSON with rendered prompts", async () => {
    await generateQuestions("key", INPUT, "ru");

    expect(mockChat).toHaveBeenCalledOnce();
    const opts = mockChat.mock.calls[0][0];
    expect(opts.messages[0].role).toBe("system");
    expect(opts.messages[0].content).toContain("3 questions");
    expect(opts.messages[0].content).toContain("4 unique");
    expect(opts.messages[0].content).toContain("ru");
    expect(opts.messages[1].role).toBe("user");
    expect(opts.messages[1].content).toContain("Movies");
    expect(opts.messages[1].content).toContain("Old question");
    expect(opts.schema.name).toBe("question_generation");
  });

  it("forwards model option", async () => {
    await generateQuestions("key", INPUT, "en", "custom/model");

    expect(mockChat.mock.calls[0][0].model).toBe("custom/model");
  });

  it("returns chatCompletionJSON result", async () => {
    const result = await generateQuestions("key", INPUT, "ru");

    expect(result.topics[0].name).toBe("Movies");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/ai/questionGeneration.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `generateQuestions`**

Create `src/ai/questionGeneration.ts`:

```typescript
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/ai/questionGeneration.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ai/questionGeneration.ts src/ai/questionGeneration.system.md src/ai/questionGeneration.user.md src/ai/questionGeneration.test.ts
git commit -m "feat(ai): add question generation module with prompts"
```

---

### Task 6: Blitz generation module

**Files:**
- Create: `src/ai/blitzGeneration.ts`
- Create: `src/ai/blitzGeneration.system.md`
- Create: `src/ai/blitzGeneration.user.md`
- Create: `src/ai/blitzGeneration.test.ts`

- [ ] **Step 1: Write system prompt**

Create `src/ai/blitzGeneration.system.md`:

```markdown
You are a task author for the blitz round of a party quiz game. In blitz rounds, the captain explains a word or phrase to teammates using only gestures — no sound, no writing.

Your task is to generate {{tasksPerRound}} items for each of {{rounds}} blitz rounds.

Each item is a word or phrase that serves as both the task and the correct answer.

Difficulty ranges from 200 to 400, in steps of 10. Within each round, arrange items from easiest to hardest.

Difficulty guidelines:
- 200–250 (easy): common fruit, animal, simple action. Short word, easy to show with gestures.
- 260–300 (medium): profession, household item, famous person.
- 310–350 (hard): abstract concept, long phrase.
- 360–400 (very hard): compound concept with preposition, uncommon word.

Constraints:
- Abstract concepts (Happiness, Democracy, etc.) must be at least 350.
- Do not repeat any word from the "past tasks" list.
- Items within a round must span different difficulty levels.

Respond in {{language}}. All items must be in {{language}}.
```

- [ ] **Step 2: Write user prompt template**

Create `src/ai/blitzGeneration.user.md`:

```markdown
Number of blitz rounds: {{rounds}}
Items per round: {{tasksPerRound}}

Past tasks (do not repeat):
{{pastTasks}}
```

- [ ] **Step 3: Write failing tests**

Create `src/ai/blitzGeneration.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BlitzGenerationInput } from "@/types/ai";

vi.mock("./client", () => ({
  chatCompletionJSON: vi.fn(),
}));

import { generateBlitzTasks } from "./blitzGeneration";
import { chatCompletionJSON } from "./client";

const mockChat = vi.mocked(chatCompletionJSON);

const INPUT: BlitzGenerationInput = {
  rounds: 2,
  tasksPerRound: 4,
  pastTasks: ["Apple"],
};

describe("generateBlitzTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      rounds: [
        { items: [{ text: "Cat", difficulty: 200 }] },
      ],
    });
  });

  it("calls chatCompletionJSON with rendered prompts", async () => {
    await generateBlitzTasks("key", INPUT, "ru");

    expect(mockChat).toHaveBeenCalledOnce();
    const opts = mockChat.mock.calls[0][0];
    expect(opts.messages[0].content).toContain("4 items");
    expect(opts.messages[0].content).toContain("2 blitz rounds");
    expect(opts.messages[0].content).toContain("ru");
    expect(opts.messages[1].content).toContain("Apple");
    expect(opts.schema.name).toBe("blitz_generation");
  });

  it("forwards model option", async () => {
    await generateBlitzTasks("key", INPUT, "en", "custom/model");

    expect(mockChat.mock.calls[0][0].model).toBe("custom/model");
  });

  it("returns chatCompletionJSON result", async () => {
    const result = await generateBlitzTasks("key", INPUT, "ru");

    expect(result.rounds[0].items[0].text).toBe("Cat");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/ai/blitzGeneration.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `generateBlitzTasks`**

Create `src/ai/blitzGeneration.ts`:

```typescript
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/ai/blitzGeneration.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ai/blitzGeneration.ts src/ai/blitzGeneration.system.md src/ai/blitzGeneration.user.md src/ai/blitzGeneration.test.ts
git commit -m "feat(ai): add blitz generation module with prompts"
```

---

### Task 7: Answer check module

**Files:**
- Create: `src/ai/answerCheck.ts`
- Create: `src/ai/answerCheck.system.md`
- Create: `src/ai/answerCheck.user.md`
- Create: `src/ai/answerCheck.test.ts`

- [ ] **Step 1: Write system prompt**

Create `src/ai/answerCheck.system.md`:

```markdown
You are a quiz judge evaluating player answers in a party quiz game.

Your task is to evaluate each player's answer to the given question.

Rules:

Correctness:
- An answer must be correct and verifiable. If it cannot be verified, reject it.

Vagueness:
- Reject vague answers that cannot be independently verified. Example: for "Name a fruit from Africa", the answer "An African fruit" is rejected.

Uniqueness:
- Semantically identical answers must be grouped together (same group number). Example: "Gagarin" and "Yuri Gagarin" form one group.
- Exception: if the question explicitly asks for synonyms, both answers are accepted as separate.

Typos:
- Minor typos are acceptable unless the question requires exact spelling.

Summary:
- Write a brief round summary comment.

For each answer, provide:
- `accepted`: whether the answer is correct
- `group`: group number if merged with another answer, or null
- `note`: brief explanation of why accepted, rejected, or grouped

Respond in {{language}}. All notes and comments must be in {{language}}.
```

- [ ] **Step 2: Write user prompt template**

Create `src/ai/answerCheck.user.md`:

```markdown
Question: {{question}}

Player answers:
{{answers}}
```

- [ ] **Step 3: Write failing tests**

Create `src/ai/answerCheck.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AnswerCheckInput } from "@/types/ai";

vi.mock("./client", () => ({
  chatCompletionJSON: vi.fn(),
}));

import { checkAnswers } from "./answerCheck";
import { chatCompletionJSON } from "./client";

const mockChat = vi.mocked(chatCompletionJSON);

const INPUT: AnswerCheckInput = {
  question: "Name a planet",
  answers: [
    { playerName: "Alice", answer: "Mars" },
    { playerName: "Bob", answer: "mars" },
  ],
};

describe("checkAnswers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({
      results: [
        { playerName: "Alice", accepted: true, group: 1, note: "Correct" },
        { playerName: "Bob", accepted: true, group: 1, note: "Same as Alice" },
      ],
      comment: "Both correct",
    });
  });

  it("calls chatCompletionJSON with rendered prompts", async () => {
    await checkAnswers("key", INPUT, "ru");

    expect(mockChat).toHaveBeenCalledOnce();
    const opts = mockChat.mock.calls[0][0];
    expect(opts.messages[0].content).toContain("quiz judge");
    expect(opts.messages[0].content).toContain("ru");
    expect(opts.messages[1].content).toContain("Name a planet");
    expect(opts.messages[1].content).toContain("Alice");
    expect(opts.messages[1].content).toContain("Mars");
    expect(opts.schema.name).toBe("answer_check");
  });

  it("forwards model option", async () => {
    await checkAnswers("key", INPUT, "en", "custom/model");

    expect(mockChat.mock.calls[0][0].model).toBe("custom/model");
  });

  it("returns chatCompletionJSON result", async () => {
    const result = await checkAnswers("key", INPUT, "ru");

    expect(result.results).toHaveLength(2);
    expect(result.comment).toBe("Both correct");
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/ai/answerCheck.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement `checkAnswers`**

Create `src/ai/answerCheck.ts`:

```typescript
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
  return answers
    .map((a) => `- ${a.playerName}: ${a.answer}`)
    .join("\n");
}

export async function checkAnswers(
  apiKey: string,
  input: AnswerCheckInput,
  language: string,
  model?: string,
): Promise<AnswerCheckResult> {
  const system = renderTemplate(systemPrompt, { language });

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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/ai/answerCheck.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ai/answerCheck.ts src/ai/answerCheck.system.md src/ai/answerCheck.user.md src/ai/answerCheck.test.ts
git commit -m "feat(ai): add answer check module with prompts"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all existing tests + 21 new tests pass.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: successful build.

- [ ] **Step 4: Update plan checklist**

Mark Phase 8.1 items as done in `task/plan-01-init.md`.

- [ ] **Step 5: Commit**

```bash
git add task/plan-01-init.md
git commit -m "docs: mark Phase 8.1 AI client as complete"
```
