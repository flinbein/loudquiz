# Phase 8.1: AI Client Design

AI module wrapping OpenRouter API for question generation and answer checking.

## Overview

Pure functions in `src/ai/`. No UI, no side effects beyond `fetch`. API key passed as parameter to every call. Prompts stored in `.md` files imported via Vite `?raw`.

## File Structure

```
src/ai/
  client.ts                       — OpenRouter API wrapper
  template.ts                     — {{variable}} template renderer
  topicGeneration.ts              — generateTopics()
  topicGeneration.system.md       — system prompt
  topicGeneration.user.md         — user prompt template
  questionGeneration.ts           — generateQuestions()
  questionGeneration.system.md
  questionGeneration.user.md
  blitzGeneration.ts              — generateBlitzTasks()
  blitzGeneration.system.md
  blitzGeneration.user.md
  answerCheck.ts                  — checkAnswers()
  answerCheck.system.md
  answerCheck.user.md
```

## client.ts

```typescript
const DEFAULT_MODEL = "google/gemini-2.0-flash-001";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_RETRIES = 3;

interface ChatCompletionOptions {
  apiKey: string;
  messages: AIMessage[];
  schema: { name: string; schema: Record<string, unknown> };
  model?: string; // default: DEFAULT_MODEL
}

function chatCompletionJSON<T>(options: ChatCompletionOptions): Promise<T>;
```

### Behavior

1. Build `AIRequest` with `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`.
2. `fetch` to OpenRouter with `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`.
3. Parse `response.choices[0].message.content` as JSON.
4. On `JSON.parse` error: retry up to `MAX_RETRIES` times, then throw.
5. On network error or non-ok HTTP status: throw immediately (no retry).
6. Return parsed result as `T`.

### Error Types

- `AINetworkError` — fetch failed or non-ok status (includes status code and body).
- `AIParseError` — JSON parse failed after all retries.

## template.ts

```typescript
function renderTemplate(template: string, vars: Record<string, string>): string;
```

Replace `{{key}}` occurrences with values from `vars`. Unknown variables are left as-is (to catch bugs in tests).

## Generation Modules

All four modules follow the same pattern:

```typescript
import systemPrompt from "./topicGeneration.system.md?raw";
import userPrompt from "./topicGeneration.user.md?raw";

function generateTopics(
  apiKey: string,
  input: TopicGenerationInput,
  language: string,
  model?: string
): Promise<TopicGenerationResult>;
```

### Internal Flow

1. Format data from `input` into strings (e.g., numbered list of suggestions).
2. `renderTemplate(systemPrompt, ...)` and `renderTemplate(userPrompt, ...)`.
3. Call `chatCompletionJSON<Result>` with the JSON schema for the result type.
4. Return result.

### JSON Schemas

Each module defines its result schema as a constant, matching the types from `src/types/ai.ts`. Schemas are colocated with the module code, not in separate files.

## Prompt Files

All prompts are written in English. Templates use `{{variable}}` syntax. Every system prompt includes `{{language}}` — the language AI must use for all generated content (topic names, questions, answers, comments, notes). The `language` parameter is passed by the calling code from the current `i18next.language` (e.g. `"ru"`, `"en"`).

### topicGeneration.system.md

Role: quiz host selecting topics. Respond in `{{language}}`. Rules per spec: respect majority preferences, ignore nonsensical/obscene suggestions, avoid overly specialized topics, don't repeat past topics, suggest own topics if suggestions are insufficient.

### topicGeneration.user.md

Variables: `{{suggestions}}` (formatted player suggestions), `{{topicCount}}`, `{{pastTopics}}`.

### questionGeneration.system.md

Role: quiz question author for a headphones quiz. Respond in `{{language}}`. Rules per spec: at least `playersPerTeam` unique answers per question, verifiable answers, difficulty 100-200 (step 10), consider that captain explains with gestures (no sound), exclusion conditions and puns allowed, provide `acceptedAnswers`.

### questionGeneration.user.md

Variables: `{{topics}}`, `{{questionsPerTopic}}`, `{{playersPerTeam}}`, `{{pastQuestions}}`.

### blitzGeneration.system.md

Role: blitz task author for a headphones quiz. Respond in `{{language}}`. Rules per spec: word/phrase to show with gestures, difficulty 200-400 (step 10), easy-to-hard within round, difficulty criteria by range.

### blitzGeneration.user.md

Variables: `{{rounds}}`, `{{tasksPerRound}}`, `{{pastTasks}}`.

### answerCheck.system.md

Role: quiz judge evaluating answers. Respond in `{{language}}`. Rules per spec: correctness and verifiability, reject vague answers, group semantically identical answers, allow minor typos, write a brief round summary.

### answerCheck.user.md

Variables: `{{question}}`, `{{answers}}`.

## Types

All types already defined in `src/types/ai.ts`: `AIMessage`, `AIRequest`, `AIResponse`, `TopicGenerationInput`, `TopicGenerationResult`, `QuestionGenerationInput`, `QuestionGenerationResult`, `BlitzGenerationInput`, `BlitzGenerationResult`, `AnswerCheckInput`, `AnswerCheckResult`.

New types to add to `src/types/ai.ts`:
- `AINetworkError` (class extending Error)
- `AIParseError` (class extending Error)

## Vite Configuration

Vite supports `?raw` imports out of the box. Add type declaration for `*.md?raw` imports in `src/vite-env.d.ts`:

```typescript
declare module "*.md?raw" {
  const content: string;
  export default content;
}
```

## Tests

### client.test.ts
- Successful request: mock fetch returns valid JSON, verify parsed result.
- Retry on invalid JSON: first 2 responses have broken JSON, 3rd is valid — returns result.
- Exhaust retries: 3 invalid JSON responses — throws `AIParseError`.
- Network error: fetch rejects — throws `AINetworkError` immediately (no retry).
- Non-ok status: fetch returns 401/500 — throws `AINetworkError` with status.

### template.test.ts
- Replace single variable.
- Replace multiple variables.
- Unknown variable left as-is.
- Empty vars object — template unchanged.

### Module tests (one per module)
- Mock `chatCompletionJSON` (vi.mock).
- Verify messages array: system prompt rendered, user prompt rendered with correct data.
- Verify schema passed correctly.
- Verify `model` forwarded when provided.
