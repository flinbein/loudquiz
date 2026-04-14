# Phase 8.2–8.3: Question Constructor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full question constructor page with manual editing and AI-assisted generation of topics, questions, and blitz tasks.

**Architecture:** Tab-based single-column layout in `ConstructorPage`. Local `useState` owns `QuestionsFile` state (no Zustand). Components are props-only. AI tab uses existing `src/ai/` modules. Data persisted to localStorage on every change.

**Tech Stack:** React 19, TypeScript (strict), CSS Modules, i18next, Vitest + Testing Library

**Spec:** `docs/superpowers/specs/2026-04-14-phase8-2-3-constructor-design.md`

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/pages/ConstructorPage.module.css` | Page layout, tab bar, tab content areas |
| `src/components/TopicChips/TopicChips.tsx` | Horizontal chip bar: select, add, delete topics |
| `src/components/TopicChips/TopicChips.module.css` | Chip styles |
| `src/components/TopicChips/TopicChips.test.tsx` | Tests |
| `src/components/QuestionList/QuestionList.tsx` | Question rows with edit/delete/check actions |
| `src/components/QuestionList/QuestionList.module.css` | Row styles |
| `src/components/QuestionList/QuestionList.test.tsx` | Tests |
| `src/components/BlitzRoundAccordion/BlitzRoundAccordion.tsx` | Collapsible blitz round with items |
| `src/components/BlitzRoundAccordion/BlitzRoundAccordion.module.css` | Accordion styles |
| `src/components/BlitzRoundAccordion/BlitzRoundAccordion.test.tsx` | Tests |
| `src/components/AITopicGenerator/AITopicGenerator.tsx` | Topic generation form + preview + apply |
| `src/components/AITopicGenerator/AITopicGenerator.module.css` | Styles |
| `src/components/AITopicGenerator/AITopicGenerator.test.tsx` | Tests |
| `src/components/AIQuestionGenerator/AIQuestionGenerator.tsx` | Question generation form + apply |
| `src/components/AIQuestionGenerator/AIQuestionGenerator.module.css` | Styles |
| `src/components/AIQuestionGenerator/AIQuestionGenerator.test.tsx` | Tests |
| `src/components/AIBlitzGenerator/AIBlitzGenerator.tsx` | Blitz generation form + apply |
| `src/components/AIBlitzGenerator/AIBlitzGenerator.module.css` | Styles |
| `src/components/AIBlitzGenerator/AIBlitzGenerator.test.tsx` | Tests |
| `src/components/AnswerCheckModal/AnswerCheckModal.tsx` | Modal: answer check via AI |
| `src/components/AnswerCheckModal/AnswerCheckModal.module.css` | Modal styles |
| `src/components/AnswerCheckModal/AnswerCheckModal.test.tsx` | Tests |
| `src/components/LanguageSwitcher/LanguageSwitcher.tsx` | ru/en toggle for app UI language |
| `src/components/LanguageSwitcher/LanguageSwitcher.module.css` | Styles |
| `src/components/LanguageSwitcher/LanguageSwitcher.test.tsx` | Tests |
| `src/logic/validateQuestionsFile.ts` | Validates imported JSON against QuestionsFile shape |
| `src/logic/validateQuestionsFile.test.ts` | Tests |

### Modified files

| File | Changes |
|------|---------|
| `src/pages/ConstructorPage.tsx` | Full rewrite: tab bar, state management, persistence, child components |
| `src/i18n/ru.json` | Add `constructor.*` keys |
| `src/i18n/en.json` | Add `constructor.*` keys |
| `src/persistence/localPersistence.ts` | Add `getLanguage()` / `setLanguage()` for UI language persistence |

---

### Task 1: i18n Keys

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`
- Modify: `src/persistence/localPersistence.ts`
- Modify: `src/i18n/index.ts`

- [ ] **Step 1: Add constructor keys to ru.json**

Add to `src/i18n/ru.json` inside the top-level object:

```json
"constructor": {
  "title": "Редактор вопросов",
  "tabs": {
    "topics": "Темы",
    "blitz": "Блиц",
    "ai": "AI"
  },
  "addTopic": "+ Тема",
  "addQuestion": "+ Вопрос",
  "addWord": "+ Слово",
  "addRound": "+ Раунд",
  "questionCount": "Вопросы ({{count}})",
  "roundWords": "Раунд {{n}} — {{count}} слов",
  "difficulty": "Сложность",
  "export": "Экспорт",
  "import": "Импорт",
  "importError": "Ошибка импорта: неверный формат JSON",
  "templateNames": "Иван,Мария,Алексей,Ольга,Дмитрий,Анна,Сергей,Елена,Николай,Татьяна",
  "language": "Язык",
  "languageRu": "русский",
  "languageEn": "English",
  "topicNamePlaceholder": "Название темы",
  "questionTextPlaceholder": "Текст вопроса",
  "blitzItemPlaceholder": "Слово / словосочетание",
  "emptyTopics": "Нет тем. Добавьте вручную или сгенерируйте через AI.",
  "emptyQuestions": "Нет вопросов в этой теме.",
  "emptyBlitz": "Нет блиц-заданий. Добавьте вручную или сгенерируйте через AI.",
  "minItemsWarning": "Минимум {{min}} слов в раунде",
  "ai": {
    "apiKey": "OpenRouter API Key",
    "apiKeyPlaceholder": "sk-or-v1-...",
    "generationLanguage": "Язык генерации",
    "generationLanguageHint": "Язык, на котором AI будет генерировать контент",
    "topicGeneration": "Генерация тем",
    "suggestions": "Предложения тем",
    "suggestionsHint": "По одному на строку, до 10",
    "topicCount": "Количество тем",
    "generate": "Сгенерировать",
    "result": "Результат",
    "apply": "Применить",
    "replaceWarning": {
      "topics": "Заменит все текущие темы и вопросы",
      "questions": "Заменит все текущие вопросы",
      "blitz": "Заменит все текущие блиц-задания"
    },
    "questionGeneration": "Генерация вопросов",
    "playersCount": "Количество игроков",
    "questionsPerTopic": "Вопросов на тему",
    "blitzGeneration": "Генерация блиц-заданий",
    "roundsCount": "Количество раундов",
    "wordsPerRound": "Слов в раунде",
    "loading": {
      "topics": "Генерируем темы...",
      "questions": "Генерируем вопросы...",
      "blitz": "Генерируем блиц-задания..."
    },
    "retry": "Повторить",
    "noTopics": "Сначала создайте темы на вкладке «Темы»",
    "noApiKey": "Укажите API Key"
  },
  "answerCheck": {
    "title": "Проверка: «{{question}}»",
    "answersLabel": "Ответы для проверки",
    "answersHint": "По одному на строку, до 10",
    "check": "Проверить",
    "close": "Закрыть",
    "accepted": "верно",
    "rejected": "неверно",
    "group": "группа {{n}}"
  }
}
```

- [ ] **Step 2: Add constructor keys to en.json**

Add to `src/i18n/en.json` inside the top-level object:

```json
"constructor": {
  "title": "Question Editor",
  "tabs": {
    "topics": "Topics",
    "blitz": "Blitz",
    "ai": "AI"
  },
  "addTopic": "+ Topic",
  "addQuestion": "+ Question",
  "addWord": "+ Word",
  "addRound": "+ Round",
  "questionCount": "Questions ({{count}})",
  "roundWords": "Round {{n}} — {{count}} words",
  "difficulty": "Difficulty",
  "export": "Export",
  "import": "Import",
  "importError": "Import error: invalid JSON format",
  "templateNames": "John,Sarah,Michael,Emma,David,Anna,James,Olivia,Robert,Sophie",
  "language": "Language",
  "languageRu": "русский",
  "languageEn": "English",
  "topicNamePlaceholder": "Topic name",
  "questionTextPlaceholder": "Question text",
  "blitzItemPlaceholder": "Word / phrase",
  "emptyTopics": "No topics. Add manually or generate with AI.",
  "emptyQuestions": "No questions in this topic.",
  "emptyBlitz": "No blitz tasks. Add manually or generate with AI.",
  "minItemsWarning": "Minimum {{min}} words per round",
  "ai": {
    "apiKey": "OpenRouter API Key",
    "apiKeyPlaceholder": "sk-or-v1-...",
    "generationLanguage": "Generation language",
    "generationLanguageHint": "Language for AI-generated content",
    "topicGeneration": "Topic Generation",
    "suggestions": "Topic suggestions",
    "suggestionsHint": "One per line, up to 10",
    "topicCount": "Number of topics",
    "generate": "Generate",
    "result": "Result",
    "apply": "Apply",
    "replaceWarning": {
      "topics": "Will replace all current topics and questions",
      "questions": "Will replace all current questions",
      "blitz": "Will replace all current blitz tasks"
    },
    "questionGeneration": "Question Generation",
    "playersCount": "Number of players",
    "questionsPerTopic": "Questions per topic",
    "blitzGeneration": "Blitz Generation",
    "roundsCount": "Number of rounds",
    "wordsPerRound": "Words per round",
    "loading": {
      "topics": "Generating topics...",
      "questions": "Generating questions...",
      "blitz": "Generating blitz tasks..."
    },
    "retry": "Retry",
    "noTopics": "Create topics first on the Topics tab",
    "noApiKey": "Enter API Key"
  },
  "answerCheck": {
    "title": "Check: «{{question}}»",
    "answersLabel": "Answers to check",
    "answersHint": "One per line, up to 10",
    "check": "Check",
    "close": "Close",
    "accepted": "correct",
    "rejected": "incorrect",
    "group": "group {{n}}"
  }
}
```

- [ ] **Step 3: Add language persistence to localPersistence.ts**

Add to the `KEYS` object in `src/persistence/localPersistence.ts`:

```typescript
language: "loud-quiz-language",
```

Add these functions at the end of the file:

```typescript
// Language

export function getLanguage(): string | null {
  return localStorage.getItem(KEYS.language);
}

export function setLanguage(lang: string): void {
  localStorage.setItem(KEYS.language, lang);
}
```

- [ ] **Step 4: Initialize i18n from persisted language**

In `src/i18n/index.ts`, import and use the persisted language:

```typescript
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLanguage } from "@/persistence/localPersistence";
import ru from "./ru.json";
import en from "./en.json";

const savedLanguage = getLanguage();

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: savedLanguage ?? "ru",
  fallbackLng: "ru",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

- [ ] **Step 5: Run `tsc --noEmit` to verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/i18n/ru.json src/i18n/en.json src/i18n/index.ts src/persistence/localPersistence.ts
git commit -m "feat(constructor): add i18n keys and language persistence"
```

---

### Task 2: JSON Validation Logic

**Files:**
- Create: `src/logic/validateQuestionsFile.ts`
- Create: `src/logic/validateQuestionsFile.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/logic/validateQuestionsFile.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validateQuestionsFile } from "./validateQuestionsFile";

describe("validateQuestionsFile", () => {
  it("accepts a valid QuestionsFile", () => {
    const result = validateQuestionsFile({
      topics: [
        {
          name: "History",
          questions: [
            { text: "Who founded Rome?", difficulty: 100, acceptedAnswers: [] },
          ],
        },
      ],
      blitzTasks: [
        {
          items: [
            { text: "Crocodile", difficulty: 200 },
            { text: "TV", difficulty: 250 },
            { text: "Philosophy", difficulty: 300 },
          ],
        },
      ],
    });
    expect(result.valid).toBe(true);
  });

  it("accepts empty topics and blitzTasks arrays", () => {
    const result = validateQuestionsFile({ topics: [], blitzTasks: [] });
    expect(result.valid).toBe(true);
  });

  it("rejects null", () => {
    const result = validateQuestionsFile(null);
    expect(result.valid).toBe(false);
  });

  it("rejects missing topics", () => {
    const result = validateQuestionsFile({ blitzTasks: [] });
    expect(result.valid).toBe(false);
  });

  it("rejects non-array topics", () => {
    const result = validateQuestionsFile({ topics: "bad", blitzTasks: [] });
    expect(result.valid).toBe(false);
  });

  it("rejects topic without name", () => {
    const result = validateQuestionsFile({
      topics: [{ questions: [] }],
      blitzTasks: [],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects question with invalid difficulty", () => {
    const result = validateQuestionsFile({
      topics: [
        {
          name: "T",
          questions: [{ text: "Q", difficulty: 999, acceptedAnswers: [] }],
        },
      ],
      blitzTasks: [],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects blitz item with invalid difficulty", () => {
    const result = validateQuestionsFile({
      topics: [],
      blitzTasks: [
        {
          items: [
            { text: "A", difficulty: 100 },
            { text: "B", difficulty: 200 },
            { text: "C", difficulty: 300 },
          ],
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it("accepts file without blitzTasks (defaults to empty)", () => {
    const result = validateQuestionsFile({
      topics: [{ name: "T", questions: [] }],
    });
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/logic/validateQuestionsFile.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement validation**

Create `src/logic/validateQuestionsFile.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/logic/validateQuestionsFile.test.ts`
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/logic/validateQuestionsFile.ts src/logic/validateQuestionsFile.test.ts
git commit -m "feat(constructor): add QuestionsFile JSON validation"
```

---

### Task 3: LanguageSwitcher Component

**Files:**
- Create: `src/components/LanguageSwitcher/LanguageSwitcher.tsx`
- Create: `src/components/LanguageSwitcher/LanguageSwitcher.module.css`
- Create: `src/components/LanguageSwitcher/LanguageSwitcher.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/components/LanguageSwitcher/LanguageSwitcher.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  it("renders current language", () => {
    render(<LanguageSwitcher currentLang="ru" onChangeLang={() => {}} />);
    expect(screen.getByRole("button")).toHaveTextContent("ru");
  });

  it("toggles from ru to en", async () => {
    const onChange = vi.fn();
    render(<LanguageSwitcher currentLang="ru" onChangeLang={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("en");
  });

  it("toggles from en to ru", async () => {
    const onChange = vi.fn();
    render(<LanguageSwitcher currentLang="en" onChangeLang={onChange} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onChange).toHaveBeenCalledWith("ru");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/LanguageSwitcher/LanguageSwitcher.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `src/components/LanguageSwitcher/LanguageSwitcher.module.css`:

```css
.btn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-transform: uppercase;
  font-weight: 600;
  min-width: 36px;
}

.btn:hover {
  background: var(--color-border);
}
```

Create `src/components/LanguageSwitcher/LanguageSwitcher.tsx`:

```typescript
import styles from "./LanguageSwitcher.module.css";

export interface LanguageSwitcherProps {
  currentLang: string;
  onChangeLang: (lang: string) => void;
}

export function LanguageSwitcher({ currentLang, onChangeLang }: LanguageSwitcherProps) {
  function toggle() {
    onChangeLang(currentLang === "ru" ? "en" : "ru");
  }

  return (
    <button type="button" className={styles.btn} onClick={toggle}>
      {currentLang}
    </button>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/LanguageSwitcher/LanguageSwitcher.test.tsx`
Expected: all 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/LanguageSwitcher/
git commit -m "feat(constructor): add LanguageSwitcher component"
```

---

### Task 4: TopicChips Component

**Files:**
- Create: `src/components/TopicChips/TopicChips.tsx`
- Create: `src/components/TopicChips/TopicChips.module.css`
- Create: `src/components/TopicChips/TopicChips.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/TopicChips/TopicChips.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopicChips } from "./TopicChips";

const topics = [
  { name: "History", questions: [] },
  { name: "Music", questions: [] },
];

describe("TopicChips", () => {
  it("renders topic names", () => {
    render(
      <TopicChips
        topics={topics}
        selectedIndex={0}
        onSelect={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
      />,
    );
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Music")).toBeInTheDocument();
  });

  it("highlights selected chip", () => {
    render(
      <TopicChips
        topics={topics}
        selectedIndex={1}
        onSelect={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
      />,
    );
    const musicChip = screen.getByText("Music").closest("button");
    expect(musicChip).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onSelect when chip clicked", async () => {
    const onSelect = vi.fn();
    render(
      <TopicChips
        topics={topics}
        selectedIndex={0}
        onSelect={onSelect}
        onDelete={() => {}}
        onAdd={() => {}}
      />,
    );
    await userEvent.click(screen.getByText("Music"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("calls onDelete when delete button clicked", async () => {
    const onDelete = vi.fn();
    render(
      <TopicChips
        topics={topics}
        selectedIndex={0}
        onSelect={() => {}}
        onDelete={onDelete}
        onAdd={() => {}}
      />,
    );
    const deleteButtons = screen.getAllByLabelText(/delete/i);
    await userEvent.click(deleteButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith(0);
  });

  it("calls onAdd when add button clicked", async () => {
    const onAdd = vi.fn();
    render(
      <TopicChips
        topics={topics}
        selectedIndex={0}
        onSelect={() => {}}
        onDelete={() => {}}
        onAdd={onAdd}
      />,
    );
    await userEvent.click(screen.getByText("+ Тема"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/TopicChips/TopicChips.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `src/components/TopicChips/TopicChips.module.css`:

```css
.container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.chip[aria-pressed="true"] {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.deleteBtn {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
  font-size: 12px;
  opacity: 0.7;
  line-height: 1;
}

.deleteBtn:hover {
  opacity: 1;
}

.addChip {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.addChip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
```

Create `src/components/TopicChips/TopicChips.tsx`:

```typescript
import { useTranslation } from "react-i18next";
import type { Topic } from "@/types/game";
import styles from "./TopicChips.module.css";

export interface TopicChipsProps {
  topics: Topic[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
}

export function TopicChips({
  topics,
  selectedIndex,
  onSelect,
  onDelete,
  onAdd,
}: TopicChipsProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      {topics.map((topic, i) => (
        <button
          key={i}
          type="button"
          className={styles.chip}
          aria-pressed={i === selectedIndex}
          onClick={() => onSelect(i)}
        >
          {topic.name || t("constructor.topicNamePlaceholder")}
          <span
            role="button"
            aria-label={`delete ${topic.name}`}
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(i);
            }}
          >
            ✕
          </span>
        </button>
      ))}
      <button type="button" className={styles.addChip} onClick={onAdd}>
        {t("constructor.addTopic")}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/TopicChips/TopicChips.test.tsx`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TopicChips/
git commit -m "feat(constructor): add TopicChips component"
```

---

### Task 5: QuestionList Component

**Files:**
- Create: `src/components/QuestionList/QuestionList.tsx`
- Create: `src/components/QuestionList/QuestionList.module.css`
- Create: `src/components/QuestionList/QuestionList.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/QuestionList/QuestionList.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionList } from "./QuestionList";
import type { Question } from "@/types/game";

const questions: Question[] = [
  { text: "Who founded Rome?", difficulty: 100, acceptedAnswers: ["Romulus"] },
  { text: "Year of Moon landing?", difficulty: 150, acceptedAnswers: [] },
];

describe("QuestionList", () => {
  it("renders question texts", () => {
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
        onCheck={() => {}}
      />,
    );
    expect(screen.getByText("Who founded Rome?")).toBeInTheDocument();
    expect(screen.getByText("Year of Moon landing?")).toBeInTheDocument();
  });

  it("renders difficulty values", () => {
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
        onCheck={() => {}}
      />,
    );
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("calls onDelete with index", async () => {
    const onDelete = vi.fn();
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={onDelete}
        onAdd={() => {}}
        onCheck={() => {}}
      />,
    );
    const deleteButtons = screen.getAllByLabelText(/delete/i);
    await userEvent.click(deleteButtons[0]!);
    expect(onDelete).toHaveBeenCalledWith(0);
  });

  it("calls onCheck with index", async () => {
    const onCheck = vi.fn();
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={() => {}}
        onAdd={() => {}}
        onCheck={onCheck}
      />,
    );
    const checkButtons = screen.getAllByLabelText(/check/i);
    await userEvent.click(checkButtons[0]!);
    expect(onCheck).toHaveBeenCalledWith(0);
  });

  it("enters edit mode and saves changes", async () => {
    const onUpdate = vi.fn();
    render(
      <QuestionList
        questions={questions}
        onUpdate={onUpdate}
        onDelete={() => {}}
        onAdd={() => {}}
        onCheck={() => {}}
      />,
    );
    const editButtons = screen.getAllByLabelText(/edit/i);
    await userEvent.click(editButtons[0]!);

    const textInput = screen.getByDisplayValue("Who founded Rome?");
    await userEvent.clear(textInput);
    await userEvent.type(textInput, "Who built Rome?");

    await userEvent.click(screen.getByLabelText(/save/i));
    expect(onUpdate).toHaveBeenCalledWith(0, {
      text: "Who built Rome?",
      difficulty: 100,
      acceptedAnswers: ["Romulus"],
    });
  });

  it("calls onAdd when add button clicked", async () => {
    const onAdd = vi.fn();
    render(
      <QuestionList
        questions={questions}
        onUpdate={() => {}}
        onDelete={() => {}}
        onAdd={onAdd}
        onCheck={() => {}}
      />,
    );
    await userEvent.click(screen.getByText("+ Вопрос"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/QuestionList/QuestionList.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `src/components/QuestionList/QuestionList.module.css`:

```css
.list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.difficulty {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 32px;
  text-align: right;
}

.actions {
  display: flex;
  gap: var(--spacing-xs);
}

.actionBtn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: var(--spacing-xs);
  font-size: 14px;
  border-radius: var(--radius-sm);
}

.actionBtn:hover {
  color: var(--color-primary);
  background: var(--color-bg);
}

.editRow {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  align-items: center;
}

.editInput {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
}

.difficultySelect {
  width: 70px;
  padding: var(--spacing-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.addBtn {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.addBtn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}
```

Create `src/components/QuestionList/QuestionList.tsx`:

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Question } from "@/types/game";
import styles from "./QuestionList.module.css";

export interface QuestionListProps {
  questions: Question[];
  onUpdate: (index: number, question: Question) => void;
  onDelete: (index: number) => void;
  onAdd: () => void;
  onCheck: (index: number) => void;
}

const DIFFICULTIES = [100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];

export function QuestionList({
  questions,
  onUpdate,
  onDelete,
  onAdd,
  onCheck,
}: QuestionListProps) {
  const { t } = useTranslation();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(100);

  function startEdit(index: number) {
    const q = questions[index]!;
    setEditingIndex(index);
    setEditText(q.text);
    setEditDifficulty(q.difficulty);
  }

  function saveEdit() {
    if (editingIndex == null) return;
    const q = questions[editingIndex]!;
    onUpdate(editingIndex, {
      text: editText,
      difficulty: editDifficulty,
      acceptedAnswers: q.acceptedAnswers,
    });
    setEditingIndex(null);
  }

  return (
    <div>
      <div className={styles.label}>
        {t("constructor.questionCount", { count: questions.length })}
      </div>
      <div className={styles.list}>
        {questions.map((q, i) =>
          editingIndex === i ? (
            <div key={i} className={styles.editRow}>
              <input
                className={styles.editInput}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
              <select
                className={styles.difficultySelect}
                value={editDifficulty}
                onChange={(e) => setEditDifficulty(Number(e.target.value))}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.actionBtn}
                aria-label="save"
                onClick={saveEdit}
              >
                ✓
              </button>
            </div>
          ) : (
            <div key={i} className={styles.row}>
              <span className={styles.text}>{q.text}</span>
              <span className={styles.difficulty}>{q.difficulty}</span>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  aria-label="check answers"
                  onClick={() => onCheck(i)}
                >
                  ✓
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  aria-label="edit"
                  onClick={() => startEdit(i)}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.actionBtn}
                  aria-label="delete"
                  onClick={() => onDelete(i)}
                >
                  ✕
                </button>
              </div>
            </div>
          ),
        )}
      </div>
      <button type="button" className={styles.addBtn} onClick={onAdd}>
        {t("constructor.addQuestion")}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/QuestionList/QuestionList.test.tsx`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/QuestionList/
git commit -m "feat(constructor): add QuestionList component with inline edit"
```

---

### Task 6: BlitzRoundAccordion Component

**Files:**
- Create: `src/components/BlitzRoundAccordion/BlitzRoundAccordion.tsx`
- Create: `src/components/BlitzRoundAccordion/BlitzRoundAccordion.module.css`
- Create: `src/components/BlitzRoundAccordion/BlitzRoundAccordion.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/BlitzRoundAccordion/BlitzRoundAccordion.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlitzRoundAccordion } from "./BlitzRoundAccordion";
import type { BlitzTask } from "@/types/game";

const task: BlitzTask = {
  items: [
    { text: "Crocodile", difficulty: 200 },
    { text: "TV", difficulty: 250 },
    { text: "Philosophy", difficulty: 300 },
  ],
};

describe("BlitzRoundAccordion", () => {
  it("renders round header with count", () => {
    render(
      <BlitzRoundAccordion
        task={task}
        roundIndex={0}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    expect(screen.getByText(/Раунд 1/)).toBeInTheDocument();
  });

  it("expands on click to show items", async () => {
    render(
      <BlitzRoundAccordion
        task={task}
        roundIndex={0}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    await userEvent.click(screen.getByText(/Раунд 1/));
    expect(screen.getByText("Crocodile")).toBeInTheDocument();
    expect(screen.getByText("TV")).toBeInTheDocument();
  });

  it("calls onDeleteRound", async () => {
    const onDeleteRound = vi.fn();
    render(
      <BlitzRoundAccordion
        task={task}
        roundIndex={0}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={onDeleteRound}
      />,
    );
    await userEvent.click(screen.getByLabelText(/delete round/i));
    expect(onDeleteRound).toHaveBeenCalledTimes(1);
  });

  it("calls onDeleteItem when item delete clicked", async () => {
    const onDeleteItem = vi.fn();
    render(
      <BlitzRoundAccordion
        task={task}
        roundIndex={0}
        defaultOpen
        onUpdateItem={() => {}}
        onDeleteItem={onDeleteItem}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    const deleteButtons = screen.getAllByLabelText(/delete item/i);
    await userEvent.click(deleteButtons[0]!);
    expect(onDeleteItem).toHaveBeenCalledWith(0);
  });

  it("hides add button when 5 items", () => {
    const fullTask: BlitzTask = {
      items: [
        { text: "A", difficulty: 200 },
        { text: "B", difficulty: 250 },
        { text: "C", difficulty: 300 },
        { text: "D", difficulty: 350 },
        { text: "E", difficulty: 400 },
      ],
    };
    render(
      <BlitzRoundAccordion
        task={fullTask}
        roundIndex={0}
        defaultOpen
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    expect(screen.queryByText("+ Слово")).not.toBeInTheDocument();
  });

  it("shows warning when fewer than 3 items", () => {
    const smallTask: BlitzTask = {
      items: [
        { text: "A", difficulty: 200 },
        { text: "B", difficulty: 250 },
      ],
    };
    render(
      <BlitzRoundAccordion
        task={smallTask}
        roundIndex={0}
        defaultOpen
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onAddItem={() => {}}
        onDeleteRound={() => {}}
      />,
    );
    expect(screen.getByText(/Минимум 3/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/BlitzRoundAccordion/BlitzRoundAccordion.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `src/components/BlitzRoundAccordion/BlitzRoundAccordion.module.css`:

```css
.accordion {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-bottom: var(--spacing-xs);
}

.header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-bg-secondary);
  cursor: pointer;
  user-select: none;
}

.headerText {
  flex: 1;
  font-size: var(--font-size-sm);
}

.arrow {
  font-size: 12px;
  transition: transform 0.2s;
}

.arrowOpen {
  transform: rotate(90deg);
}

.deleteRoundBtn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: var(--spacing-xs);
  font-size: 12px;
}

.deleteRoundBtn:hover {
  color: var(--color-error);
}

.body {
  padding: var(--spacing-sm) var(--spacing-md);
}

.itemRow {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
}

.itemText {
  flex: 1;
}

.itemDifficulty {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 32px;
  text-align: right;
}

.itemActions {
  display: flex;
  gap: var(--spacing-xs);
}

.actionBtn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: var(--spacing-xs);
  font-size: 14px;
}

.actionBtn:hover {
  color: var(--color-primary);
}

.editRow {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) 0;
  align-items: center;
}

.editInput {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
}

.difficultySelect {
  width: 70px;
  padding: var(--spacing-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.addBtn {
  width: 100%;
  padding: var(--spacing-xs);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-xs);
}

.addBtn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.warning {
  font-size: var(--font-size-sm);
  color: var(--color-warning);
  margin-top: var(--spacing-xs);
}
```

Create `src/components/BlitzRoundAccordion/BlitzRoundAccordion.tsx`:

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BlitzItem, BlitzTask } from "@/types/game";
import styles from "./BlitzRoundAccordion.module.css";

export interface BlitzRoundAccordionProps {
  task: BlitzTask;
  roundIndex: number;
  defaultOpen?: boolean;
  onUpdateItem: (itemIndex: number, item: BlitzItem) => void;
  onDeleteItem: (itemIndex: number) => void;
  onAddItem: () => void;
  onDeleteRound: () => void;
}

const BLITZ_DIFFICULTIES = Array.from({ length: 21 }, (_, i) => 200 + i * 10);
const MAX_ITEMS = 5;
const MIN_ITEMS = 3;

export function BlitzRoundAccordion({
  task,
  roundIndex,
  defaultOpen = false,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onDeleteRound,
}: BlitzRoundAccordionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editDifficulty, setEditDifficulty] = useState(200);

  function startEdit(index: number) {
    const item = task.items[index]!;
    setEditingIndex(index);
    setEditText(item.text);
    setEditDifficulty(item.difficulty);
  }

  function saveEdit() {
    if (editingIndex == null) return;
    onUpdateItem(editingIndex, { text: editText, difficulty: editDifficulty });
    setEditingIndex(null);
  }

  return (
    <div className={styles.accordion}>
      <div className={styles.header} onClick={() => setOpen(!open)}>
        <span className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}>
          ▸
        </span>
        <span className={styles.headerText}>
          {t("constructor.roundWords", {
            n: roundIndex + 1,
            count: task.items.length,
          })}
        </span>
        <button
          type="button"
          className={styles.deleteRoundBtn}
          aria-label="delete round"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteRound();
          }}
        >
          ✕
        </button>
      </div>
      {open && (
        <div className={styles.body}>
          {task.items.map((item, i) =>
            editingIndex === i ? (
              <div key={i} className={styles.editRow}>
                <input
                  className={styles.editInput}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <select
                  className={styles.difficultySelect}
                  value={editDifficulty}
                  onChange={(e) =>
                    setEditDifficulty(Number(e.target.value))
                  }
                >
                  {BLITZ_DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={styles.actionBtn}
                  aria-label="save"
                  onClick={saveEdit}
                >
                  ✓
                </button>
              </div>
            ) : (
              <div key={i} className={styles.itemRow}>
                <span className={styles.itemText}>{item.text}</span>
                <span className={styles.itemDifficulty}>{item.difficulty}</span>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    aria-label="edit item"
                    onClick={() => startEdit(i)}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    aria-label="delete item"
                    onClick={() => onDeleteItem(i)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ),
          )}
          {task.items.length < MAX_ITEMS && (
            <button type="button" className={styles.addBtn} onClick={onAddItem}>
              {t("constructor.addWord")}
            </button>
          )}
          {task.items.length < MIN_ITEMS && (
            <div className={styles.warning}>
              {t("constructor.minItemsWarning", { min: MIN_ITEMS })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/BlitzRoundAccordion/BlitzRoundAccordion.test.tsx`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/BlitzRoundAccordion/
git commit -m "feat(constructor): add BlitzRoundAccordion component"
```

---

### Task 7: AI Generator Components

**Files:**
- Create: `src/components/AITopicGenerator/AITopicGenerator.tsx`
- Create: `src/components/AITopicGenerator/AITopicGenerator.module.css`
- Create: `src/components/AITopicGenerator/AITopicGenerator.test.tsx`
- Create: `src/components/AIQuestionGenerator/AIQuestionGenerator.tsx`
- Create: `src/components/AIQuestionGenerator/AIQuestionGenerator.module.css`
- Create: `src/components/AIQuestionGenerator/AIQuestionGenerator.test.tsx`
- Create: `src/components/AIBlitzGenerator/AIBlitzGenerator.tsx`
- Create: `src/components/AIBlitzGenerator/AIBlitzGenerator.module.css`
- Create: `src/components/AIBlitzGenerator/AIBlitzGenerator.test.tsx`

All three generators share the same pattern: form inputs, generate button, loading/error states, preview, apply. They use a shared CSS module for consistent styling.

- [ ] **Step 1: Create shared AI styles**

Create `src/components/AITopicGenerator/AITopicGenerator.module.css`:

```css
.section {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.sectionTitle {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: var(--spacing-sm);
}

.label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.textarea {
  width: 100%;
  box-sizing: border-box;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text);
  resize: vertical;
  min-height: 80px;
}

.counter {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: right;
  margin-top: 2px;
}

.row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  margin-top: var(--spacing-sm);
}

.numInput {
  width: 60px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
  text-align: center;
}

.generateBtn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.generateBtn:hover {
  opacity: 0.9;
}

.generateBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.preview {
  margin-top: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm);
  background: var(--color-bg);
}

.previewTitle {
  font-size: 12px;
  color: var(--color-primary);
  margin-bottom: var(--spacing-xs);
}

.previewItem {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px dotted var(--color-border);
  font-size: var(--font-size-sm);
}

.previewReason {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.applyBtn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-success);
  color: #fff;
  font-size: var(--font-size-sm);
  cursor: pointer;
  margin-top: var(--spacing-sm);
}

.warning {
  font-size: 12px;
  color: var(--color-warning);
  margin-top: var(--spacing-xs);
}

.hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.loading {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: #5a2a2a20;
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  margin-top: var(--spacing-sm);
}

.errorText {
  font-size: var(--font-size-sm);
  color: var(--color-error);
}

.retryBtn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-error);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
```

- [ ] **Step 2: Write AITopicGenerator tests**

Create `src/components/AITopicGenerator/AITopicGenerator.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AITopicGenerator } from "./AITopicGenerator";

describe("AITopicGenerator", () => {
  it("renders suggestions textarea and generate button", () => {
    render(
      <AITopicGenerator
        apiKey="sk-test"
        language="русский"
        onApply={() => {}}
      />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByText("Сгенерировать")).toBeInTheDocument();
  });

  it("disables generate when no apiKey", () => {
    render(
      <AITopicGenerator apiKey="" language="русский" onApply={() => {}} />,
    );
    expect(screen.getByText("Сгенерировать")).toBeDisabled();
  });

  it("limits textarea to 10 lines", async () => {
    render(
      <AITopicGenerator
        apiKey="sk-test"
        language="русский"
        onApply={() => {}}
      />,
    );
    const textarea = screen.getByRole("textbox");
    const lines = Array.from({ length: 12 }, (_, i) => `topic${i}`).join("\n");
    await userEvent.clear(textarea);
    await userEvent.type(textarea, lines);
    const value = (textarea as HTMLTextAreaElement).value;
    expect(value.split("\n").length).toBeLessThanOrEqual(10);
  });

  it("shows counter", () => {
    render(
      <AITopicGenerator
        apiKey="sk-test"
        language="русский"
        onApply={() => {}}
      />,
    );
    expect(screen.getByText("0 / 10")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Implement AITopicGenerator**

Create `src/components/AITopicGenerator/AITopicGenerator.tsx`:

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { generateTopics } from "@/ai/topicGeneration";
import type { TopicGenerationResult } from "@/types/ai";
import type { Topic } from "@/types/game";
import styles from "./AITopicGenerator.module.css";

export interface AITopicGeneratorProps {
  apiKey: string;
  language: string;
  onApply: (topics: Topic[]) => void;
}

const MAX_LINES = 10;

export function AITopicGenerator({
  apiKey,
  language,
  onApply,
}: AITopicGeneratorProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState("");
  const [topicCount, setTopicCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopicGenerationResult | null>(null);

  const lineCount = suggestions ? suggestions.split("\n").filter(Boolean).length : 0;

  function handleSuggestionsChange(value: string) {
    const lines = value.split("\n");
    if (lines.length > MAX_LINES) {
      setSuggestions(lines.slice(0, MAX_LINES).join("\n"));
    } else {
      setSuggestions(value);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const lines = suggestions
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const res = await generateTopics(apiKey, {
        suggestions: lines.map((text) => ({ playerName: "", text })),
        topicCount,
        pastTopics: [],
      }, language);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    const topics: Topic[] = result.topics.map((t) => ({
      name: t.name,
      questions: [],
    }));
    onApply(topics);
    setResult(null);
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{t("constructor.ai.topicGeneration")}</div>

      <div className={styles.label}>{t("constructor.ai.suggestions")}</div>
      <textarea
        className={styles.textarea}
        value={suggestions}
        onChange={(e) => handleSuggestionsChange(e.target.value)}
        placeholder={t("constructor.ai.suggestionsHint")}
        rows={4}
      />
      <div className={styles.counter}>{lineCount} / {MAX_LINES}</div>

      <div className={styles.row}>
        <span className={styles.label}>{t("constructor.ai.topicCount")}</span>
        <input
          type="number"
          className={styles.numInput}
          value={topicCount}
          min={1}
          max={10}
          onChange={(e) => setTopicCount(Number(e.target.value))}
        />
        <button
          type="button"
          className={styles.generateBtn}
          disabled={!apiKey || loading}
          onClick={handleGenerate}
        >
          {t("constructor.ai.generate")}
        </button>
      </div>

      {!apiKey && (
        <div className={styles.hint}>{t("constructor.ai.noApiKey")}</div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t("constructor.ai.loading.topics")}</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span className={styles.errorText}>{error}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={handleGenerate}
          >
            {t("constructor.ai.retry")}
          </button>
        </div>
      )}

      {result && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>{t("constructor.ai.result")}</div>
          {result.topics.map((topic, i) => (
            <div key={i} className={styles.previewItem}>
              <span>{topic.name}</span>
              <span className={styles.previewReason}>{topic.reason}</span>
            </div>
          ))}
          <button
            type="button"
            className={styles.applyBtn}
            onClick={handleApply}
          >
            {t("constructor.ai.apply")}
          </button>
          <div className={styles.warning}>
            {t("constructor.ai.replaceWarning.topics")}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/components/AITopicGenerator/AITopicGenerator.test.tsx`
Expected: all 4 tests PASS

- [ ] **Step 5: Create AIQuestionGenerator with same pattern**

Create `src/components/AIQuestionGenerator/AIQuestionGenerator.module.css` — symlink or copy from `AITopicGenerator.module.css` (same styles).

Create `src/components/AIQuestionGenerator/AIQuestionGenerator.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIQuestionGenerator } from "./AIQuestionGenerator";

describe("AIQuestionGenerator", () => {
  it("renders players count and questions per topic inputs", () => {
    render(
      <AIQuestionGenerator
        apiKey="sk-test"
        language="русский"
        topicNames={["History"]}
        onApply={() => {}}
      />,
    );
    expect(screen.getByText("Сгенерировать")).toBeInTheDocument();
  });

  it("disables generate when no topics", () => {
    render(
      <AIQuestionGenerator
        apiKey="sk-test"
        language="русский"
        topicNames={[]}
        onApply={() => {}}
      />,
    );
    expect(screen.getByText("Сгенерировать")).toBeDisabled();
  });

  it("disables generate when no apiKey", () => {
    render(
      <AIQuestionGenerator
        apiKey=""
        language="русский"
        topicNames={["History"]}
        onApply={() => {}}
      />,
    );
    expect(screen.getByText("Сгенерировать")).toBeDisabled();
  });
});
```

Create `src/components/AIQuestionGenerator/AIQuestionGenerator.tsx`:

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { generateQuestions } from "@/ai/questionGeneration";
import type { QuestionGenerationResult } from "@/types/ai";
import type { Topic } from "@/types/game";
import styles from "./AIQuestionGenerator.module.css";

export interface AIQuestionGeneratorProps {
  apiKey: string;
  language: string;
  topicNames: string[];
  onApply: (topics: Topic[]) => void;
}

export function AIQuestionGenerator({
  apiKey,
  language,
  topicNames,
  onApply,
}: AIQuestionGeneratorProps) {
  const { t } = useTranslation();
  const [playersCount, setPlayersCount] = useState(6);
  const [questionsPerTopic, setQuestionsPerTopic] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuestionGenerationResult | null>(null);

  const canGenerate = apiKey && topicNames.length > 0 && !loading;

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateQuestions(apiKey, {
        topics: topicNames,
        questionsPerTopic,
        playersPerTeam: playersCount,
        pastQuestions: [],
      }, language);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    const topics: Topic[] = result.topics.map((t) => ({
      name: t.name,
      questions: t.questions.map((q) => ({
        text: q.text,
        difficulty: q.difficulty,
        acceptedAnswers: q.acceptedAnswers,
      })),
    }));
    onApply(topics);
    setResult(null);
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        {t("constructor.ai.questionGeneration")}
      </div>

      <div className={styles.row}>
        <span className={styles.label}>{t("constructor.ai.playersCount")}</span>
        <input
          type="number"
          className={styles.numInput}
          value={playersCount}
          min={1}
          max={10}
          onChange={(e) => setPlayersCount(Math.min(10, Number(e.target.value)))}
        />
        <span className={styles.label}>
          {t("constructor.ai.questionsPerTopic")}
        </span>
        <input
          type="number"
          className={styles.numInput}
          value={questionsPerTopic}
          min={1}
          max={20}
          onChange={(e) => setQuestionsPerTopic(Number(e.target.value))}
        />
        <button
          type="button"
          className={styles.generateBtn}
          disabled={!canGenerate}
          onClick={handleGenerate}
        >
          {t("constructor.ai.generate")}
        </button>
      </div>

      {topicNames.length === 0 && (
        <div className={styles.hint}>{t("constructor.ai.noTopics")}</div>
      )}

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t("constructor.ai.loading.questions")}</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span className={styles.errorText}>{error}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={handleGenerate}
          >
            {t("constructor.ai.retry")}
          </button>
        </div>
      )}

      {result && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>{t("constructor.ai.result")}</div>
          {result.topics.map((topic, i) => (
            <div key={i}>
              <strong>{topic.name}</strong>
              {topic.questions.map((q, j) => (
                <div key={j} className={styles.previewItem}>
                  <span>{q.text}</span>
                  <span className={styles.previewReason}>{q.difficulty}</span>
                </div>
              ))}
            </div>
          ))}
          <button
            type="button"
            className={styles.applyBtn}
            onClick={handleApply}
          >
            {t("constructor.ai.apply")}
          </button>
          <div className={styles.warning}>
            {t("constructor.ai.replaceWarning.questions")}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create AIBlitzGenerator with same pattern**

Create `src/components/AIBlitzGenerator/AIBlitzGenerator.module.css` — copy from `AITopicGenerator.module.css`.

Create `src/components/AIBlitzGenerator/AIBlitzGenerator.test.tsx`:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AIBlitzGenerator } from "./AIBlitzGenerator";

describe("AIBlitzGenerator", () => {
  it("renders rounds and words per round inputs", () => {
    render(
      <AIBlitzGenerator apiKey="sk-test" language="русский" onApply={() => {}} />,
    );
    expect(screen.getByText("Сгенерировать")).toBeInTheDocument();
  });

  it("disables generate when no apiKey", () => {
    render(
      <AIBlitzGenerator apiKey="" language="русский" onApply={() => {}} />,
    );
    expect(screen.getByText("Сгенерировать")).toBeDisabled();
  });
});
```

Create `src/components/AIBlitzGenerator/AIBlitzGenerator.tsx`:

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { generateBlitzTasks } from "@/ai/blitzGeneration";
import type { BlitzGenerationResult } from "@/types/ai";
import type { BlitzTask } from "@/types/game";
import styles from "./AIBlitzGenerator.module.css";

export interface AIBlitzGeneratorProps {
  apiKey: string;
  language: string;
  onApply: (tasks: BlitzTask[]) => void;
}

export function AIBlitzGenerator({
  apiKey,
  language,
  onApply,
}: AIBlitzGeneratorProps) {
  const { t } = useTranslation();
  const [roundsCount, setRoundsCount] = useState(3);
  const [wordsPerRound, setWordsPerRound] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BlitzGenerationResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await generateBlitzTasks(apiKey, {
        rounds: roundsCount,
        tasksPerRound: wordsPerRound,
        pastTasks: [],
      }, language);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    const tasks: BlitzTask[] = result.rounds.map((r) => ({
      items: r.items.map((item) => ({
        text: item.text,
        difficulty: item.difficulty,
      })),
    }));
    onApply(tasks);
    setResult(null);
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>
        {t("constructor.ai.blitzGeneration")}
      </div>

      <div className={styles.row}>
        <span className={styles.label}>{t("constructor.ai.roundsCount")}</span>
        <input
          type="number"
          className={styles.numInput}
          value={roundsCount}
          min={1}
          max={10}
          onChange={(e) => setRoundsCount(Number(e.target.value))}
        />
        <span className={styles.label}>{t("constructor.ai.wordsPerRound")}</span>
        <input
          type="number"
          className={styles.numInput}
          value={wordsPerRound}
          min={3}
          max={5}
          onChange={(e) => setWordsPerRound(Number(e.target.value))}
        />
        <button
          type="button"
          className={styles.generateBtn}
          disabled={!apiKey || loading}
          onClick={handleGenerate}
        >
          {t("constructor.ai.generate")}
        </button>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>{t("constructor.ai.loading.blitz")}</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span className={styles.errorText}>{error}</span>
          <button
            type="button"
            className={styles.retryBtn}
            onClick={handleGenerate}
          >
            {t("constructor.ai.retry")}
          </button>
        </div>
      )}

      {result && (
        <div className={styles.preview}>
          <div className={styles.previewTitle}>{t("constructor.ai.result")}</div>
          {result.rounds.map((round, i) => (
            <div key={i}>
              <strong>
                {t("constructor.roundWords", {
                  n: i + 1,
                  count: round.items.length,
                })}
              </strong>
              {round.items.map((item, j) => (
                <div key={j} className={styles.previewItem}>
                  <span>{item.text}</span>
                  <span className={styles.previewReason}>{item.difficulty}</span>
                </div>
              ))}
            </div>
          ))}
          <button
            type="button"
            className={styles.applyBtn}
            onClick={handleApply}
          >
            {t("constructor.ai.apply")}
          </button>
          <div className={styles.warning}>
            {t("constructor.ai.replaceWarning.blitz")}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Run all AI generator tests**

Run: `npx vitest run src/components/AITopicGenerator/ src/components/AIQuestionGenerator/ src/components/AIBlitzGenerator/`
Expected: all 9 tests PASS

- [ ] **Step 8: Commit**

```bash
git add src/components/AITopicGenerator/ src/components/AIQuestionGenerator/ src/components/AIBlitzGenerator/
git commit -m "feat(constructor): add AI generator components (topics, questions, blitz)"
```

---

### Task 8: AnswerCheckModal Component

**Files:**
- Create: `src/components/AnswerCheckModal/AnswerCheckModal.tsx`
- Create: `src/components/AnswerCheckModal/AnswerCheckModal.module.css`
- Create: `src/components/AnswerCheckModal/AnswerCheckModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/AnswerCheckModal/AnswerCheckModal.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnswerCheckModal } from "./AnswerCheckModal";

describe("AnswerCheckModal", () => {
  it("does not render when closed", () => {
    render(
      <AnswerCheckModal
        open={false}
        question={{ text: "Q?", difficulty: 100, acceptedAnswers: [] }}
        apiKey="sk-test"
        language="русский"
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText(/Проверка/)).not.toBeInTheDocument();
  });

  it("renders question text in title", () => {
    render(
      <AnswerCheckModal
        open
        question={{ text: "Who founded Rome?", difficulty: 100, acceptedAnswers: [] }}
        apiKey="sk-test"
        language="русский"
        onClose={() => {}}
      />,
    );
    expect(screen.getByText(/Who founded Rome/)).toBeInTheDocument();
  });

  it("pre-fills textarea from acceptedAnswers", () => {
    render(
      <AnswerCheckModal
        open
        question={{
          text: "Q?",
          difficulty: 100,
          acceptedAnswers: ["Answer1", "Answer2"],
        }}
        apiKey="sk-test"
        language="русский"
        onClose={() => {}}
      />,
    );
    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Answer1\nAnswer2");
  });

  it("calls onClose when close button clicked", async () => {
    const onClose = vi.fn();
    render(
      <AnswerCheckModal
        open
        question={{ text: "Q?", difficulty: 100, acceptedAnswers: [] }}
        apiKey="sk-test"
        language="русский"
        onClose={onClose}
      />,
    );
    await userEvent.click(screen.getByText("Закрыть"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("limits textarea to 10 lines", async () => {
    render(
      <AnswerCheckModal
        open
        question={{ text: "Q?", difficulty: 100, acceptedAnswers: [] }}
        apiKey="sk-test"
        language="русский"
        onClose={() => {}}
      />,
    );
    const textarea = screen.getByRole("textbox");
    const lines = Array.from({ length: 12 }, (_, i) => `answer${i}`).join("\n");
    await userEvent.type(textarea, lines);
    const value = (textarea as HTMLTextAreaElement).value;
    expect(value.split("\n").length).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/AnswerCheckModal/AnswerCheckModal.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement component**

Create `src/components/AnswerCheckModal/AnswerCheckModal.module.css`:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--spacing-md);
}

.modal {
  background: var(--color-bg);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.title {
  font-size: var(--font-size-lg);
  margin-bottom: var(--spacing-md);
}

.label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
}

.textarea {
  width: 100%;
  box-sizing: border-box;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-bg-secondary);
  color: var(--color-text);
  resize: vertical;
  min-height: 100px;
}

.counter {
  font-size: 12px;
  color: var(--color-text-secondary);
  text-align: right;
  margin-top: 2px;
}

.hint {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}

.checkBtn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.checkBtn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.closeBtn {
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.results {
  margin-top: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--spacing-sm);
}

.resultRow {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px dotted var(--color-border);
  font-size: var(--font-size-sm);
}

.accepted {
  color: var(--color-success);
}

.rejected {
  color: var(--color-warning);
}

.playerName {
  color: var(--color-text-secondary);
}

.comment {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  border-top: 1px solid var(--color-border);
}

.loading {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) 0;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top: 2px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}
```

Create `src/components/AnswerCheckModal/AnswerCheckModal.tsx`:

```typescript
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { checkAnswers } from "@/ai/answerCheck";
import type { AnswerCheckResult } from "@/types/ai";
import type { Question } from "@/types/game";
import styles from "./AnswerCheckModal.module.css";

export interface AnswerCheckModalProps {
  open: boolean;
  question: Question;
  apiKey: string;
  language: string;
  onClose: () => void;
}

const MAX_LINES = 10;

export function AnswerCheckModal({
  open,
  question,
  apiKey,
  language,
  onClose,
}: AnswerCheckModalProps) {
  const { t } = useTranslation();
  const templateNames = t("constructor.templateNames").split(",");

  const [answers, setAnswers] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerCheckResult | null>(null);

  useEffect(() => {
    if (open) {
      setAnswers(question.acceptedAnswers.join("\n"));
      setResult(null);
      setError(null);
    }
  }, [open, question]);

  if (!open) return null;

  const lineCount = answers ? answers.split("\n").filter(Boolean).length : 0;

  function handleAnswersChange(value: string) {
    const lines = value.split("\n");
    if (lines.length > MAX_LINES) {
      setAnswers(lines.slice(0, MAX_LINES).join("\n"));
    } else {
      setAnswers(value);
    }
  }

  async function handleCheck() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const lines = answers
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const res = await checkAnswers(apiKey, {
        question: question.text,
        answers: lines.map((answer, i) => ({
          playerName: templateNames[i] ?? `Player${i + 1}`,
          answer,
        })),
      }, language);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.title}>
          {t("constructor.answerCheck.title", { question: question.text })}
        </div>

        <div className={styles.label}>
          {t("constructor.answerCheck.answersLabel")}
        </div>
        <textarea
          className={styles.textarea}
          value={answers}
          onChange={(e) => handleAnswersChange(e.target.value)}
          placeholder={t("constructor.answerCheck.answersHint")}
          rows={5}
        />
        <div className={styles.counter}>{lineCount} / {MAX_LINES}</div>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {result && (
          <div className={styles.results}>
            {result.results.map((r, i) => (
              <div key={i} className={styles.resultRow}>
                <span>
                  <span className={styles.playerName}>{r.playerName}: </span>
                  {answers.split("\n").filter(Boolean)[i] ?? ""}
                </span>
                <span className={r.accepted ? styles.accepted : styles.rejected}>
                  {r.accepted
                    ? t("constructor.answerCheck.accepted")
                    : t("constructor.answerCheck.rejected")}
                  {r.group != null &&
                    ` (${t("constructor.answerCheck.group", { n: r.group })})`}
                </span>
              </div>
            ))}
            {result.comment && (
              <div className={styles.comment}>{result.comment}</div>
            )}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.checkBtn}
            disabled={loading || lineCount === 0}
            onClick={handleCheck}
          >
            {t("constructor.answerCheck.check")}
          </button>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
          >
            {t("constructor.answerCheck.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/AnswerCheckModal/AnswerCheckModal.test.tsx`
Expected: all 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/AnswerCheckModal/
git commit -m "feat(constructor): add AnswerCheckModal component"
```

---

### Task 9: ConstructorPage — Full Assembly

**Files:**
- Modify: `src/pages/ConstructorPage.tsx` (full rewrite)
- Create: `src/pages/ConstructorPage.module.css`

- [ ] **Step 1: Create page styles**

Create `src/pages/ConstructorPage.module.css`:

```css
.page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

.title {
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-md);
}

.tabBar {
  display: flex;
  gap: 2px;
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  padding: 3px;
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}

.tab {
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.tabActive {
  background: var(--color-primary);
  color: #fff;
}

.tabBarRight {
  margin-left: auto;
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}

.jsonBtn {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  cursor: pointer;
}

.jsonBtn:hover {
  background: var(--color-bg-secondary);
}

.tabContent {
  min-height: 300px;
}

.topicNameInput {
  width: 100%;
  box-sizing: border-box;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  background: var(--color-bg);
  color: var(--color-text);
  margin-bottom: var(--spacing-md);
}

.empty {
  text-align: center;
  color: var(--color-text-secondary);
  padding: var(--spacing-xl);
}

.error {
  color: var(--color-error);
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}

.addRoundBtn {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: var(--font-size-sm);
  margin-top: var(--spacing-sm);
}

.addRoundBtn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.aiSettings {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.aiSettingsRow {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}

.apiKeyInput {
  flex: 1;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
}

.langInput {
  width: 200px;
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-bg);
  color: var(--color-text);
}

.settingsLabel {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  min-width: 100px;
}

.settingsHint {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.hiddenInput {
  display: none;
}
```

- [ ] **Step 2: Implement ConstructorPage**

Rewrite `src/pages/ConstructorPage.tsx`:

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { QuestionsFile, Topic, Question, BlitzTask, BlitzItem } from "@/types/game";
import {
  getConstructorData,
  setConstructorData,
  getApiKey,
  setApiKey,
  setLanguage,
} from "@/persistence/localPersistence";
import { validateQuestionsFile } from "@/logic/validateQuestionsFile";
import { TopicChips } from "@/components/TopicChips/TopicChips";
import { QuestionList } from "@/components/QuestionList/QuestionList";
import { BlitzRoundAccordion } from "@/components/BlitzRoundAccordion/BlitzRoundAccordion";
import { AITopicGenerator } from "@/components/AITopicGenerator/AITopicGenerator";
import { AIQuestionGenerator } from "@/components/AIQuestionGenerator/AIQuestionGenerator";
import { AIBlitzGenerator } from "@/components/AIBlitzGenerator/AIBlitzGenerator";
import { AnswerCheckModal } from "@/components/AnswerCheckModal/AnswerCheckModal";
import { LanguageSwitcher } from "@/components/LanguageSwitcher/LanguageSwitcher";
import styles from "./ConstructorPage.module.css";

type Tab = "topics" | "blitz" | "ai";

const LANGUAGE_NAMES: Record<string, string> = {
  ru: "русский",
  en: "English",
};

const emptyData: QuestionsFile = { topics: [], blitzTasks: [] };

export function ConstructorPage() {
  const { t, i18n } = useTranslation();

  const [data, setData] = useState<QuestionsFile>(
    () => getConstructorData() ?? { ...emptyData },
  );
  const [tab, setTab] = useState<Tab>("topics");
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0);
  const [apiKeyValue, setApiKeyValue] = useState(getApiKey);
  const [genLanguage, setGenLanguage] = useState(
    () => LANGUAGE_NAMES[i18n.language] ?? i18n.language,
  );
  const [genLanguageEdited, setGenLanguageEdited] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [checkQuestionIndex, setCheckQuestionIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist on every change
  useEffect(() => {
    setConstructorData(data);
  }, [data]);

  // Sync generation language with UI language if not manually edited
  useEffect(() => {
    if (!genLanguageEdited) {
      setGenLanguage(LANGUAGE_NAMES[i18n.language] ?? i18n.language);
    }
  }, [i18n.language, genLanguageEdited]);

  function handleLanguageChange(lang: string) {
    i18n.changeLanguage(lang);
    setLanguage(lang);
  }

  // --- Topic operations ---
  const updateData = useCallback((updater: (prev: QuestionsFile) => QuestionsFile) => {
    setData(updater);
  }, []);

  function addTopic() {
    updateData((prev) => ({
      ...prev,
      topics: [...prev.topics, { name: "", questions: [] }],
    }));
    setSelectedTopicIndex(data.topics.length);
  }

  function deleteTopic(index: number) {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index),
    }));
    if (selectedTopicIndex >= data.topics.length - 1) {
      setSelectedTopicIndex(Math.max(0, data.topics.length - 2));
    }
  }

  function updateTopicName(name: string) {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) =>
        i === selectedTopicIndex ? { ...t, name } : t,
      ),
    }));
  }

  function updateQuestion(qIndex: number, question: Question) {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) =>
        i === selectedTopicIndex
          ? {
              ...t,
              questions: t.questions.map((q, j) =>
                j === qIndex ? question : q,
              ),
            }
          : t,
      ),
    }));
  }

  function deleteQuestion(qIndex: number) {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) =>
        i === selectedTopicIndex
          ? { ...t, questions: t.questions.filter((_, j) => j !== qIndex) }
          : t,
      ),
    }));
  }

  function addQuestion() {
    updateData((prev) => ({
      ...prev,
      topics: prev.topics.map((t, i) =>
        i === selectedTopicIndex
          ? {
              ...t,
              questions: [
                ...t.questions,
                { text: "", difficulty: 100, acceptedAnswers: [] },
              ],
            }
          : t,
      ),
    }));
  }

  // --- Blitz operations ---
  function addBlitzRound() {
    updateData((prev) => ({
      ...prev,
      blitzTasks: [...prev.blitzTasks, { items: [] }],
    }));
  }

  function deleteBlitzRound(index: number) {
    updateData((prev) => ({
      ...prev,
      blitzTasks: prev.blitzTasks.filter((_, i) => i !== index),
    }));
  }

  function updateBlitzItem(
    roundIndex: number,
    itemIndex: number,
    item: BlitzItem,
  ) {
    updateData((prev) => ({
      ...prev,
      blitzTasks: prev.blitzTasks.map((task, i) =>
        i === roundIndex
          ? {
              ...task,
              items: task.items.map((it, j) => (j === itemIndex ? item : it)),
            }
          : task,
      ),
    }));
  }

  function deleteBlitzItem(roundIndex: number, itemIndex: number) {
    updateData((prev) => ({
      ...prev,
      blitzTasks: prev.blitzTasks.map((task, i) =>
        i === roundIndex
          ? { ...task, items: task.items.filter((_, j) => j !== itemIndex) }
          : task,
      ),
    }));
  }

  function addBlitzItem(roundIndex: number) {
    updateData((prev) => ({
      ...prev,
      blitzTasks: prev.blitzTasks.map((task, i) =>
        i === roundIndex
          ? {
              ...task,
              items: [...task.items, { text: "", difficulty: 200 }],
            }
          : task,
      ),
    }));
  }

  // --- AI apply handlers ---
  function applyTopics(topics: Topic[]) {
    setData({ ...data, topics });
    setSelectedTopicIndex(0);
    setTab("topics");
  }

  function applyQuestions(topics: Topic[]) {
    setData({ ...data, topics });
    setTab("topics");
  }

  function applyBlitzTasks(tasks: BlitzTask[]) {
    setData({ ...data, blitzTasks: tasks });
    setTab("blitz");
  }

  // --- Export / Import ---
  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "loud-quiz-questions.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const result = validateQuestionsFile(parsed);
        if (result.valid && result.data) {
          setData(result.data);
          setSelectedTopicIndex(0);
          setImportError(null);
        } else {
          setImportError(result.error ?? t("constructor.importError"));
        }
      } catch {
        setImportError(t("constructor.importError"));
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    e.target.value = "";
  }

  // --- API key ---
  function handleApiKeyChange(value: string) {
    setApiKeyValue(value);
    setApiKey(value);
  }

  const selectedTopic = data.topics[selectedTopicIndex];
  const checkQuestion = checkQuestionIndex != null
    ? selectedTopic?.questions[checkQuestionIndex] ?? null
    : null;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("constructor.title")}</h1>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tab} ${tab === "topics" ? styles.tabActive : ""}`}
          onClick={() => setTab("topics")}
        >
          {t("constructor.tabs.topics")}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "blitz" ? styles.tabActive : ""}`}
          onClick={() => setTab("blitz")}
        >
          {t("constructor.tabs.blitz")}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === "ai" ? styles.tabActive : ""}`}
          onClick={() => setTab("ai")}
        >
          {t("constructor.tabs.ai")}
        </button>
        <div className={styles.tabBarRight}>
          <button
            type="button"
            className={styles.jsonBtn}
            onClick={handleExport}
          >
            {t("constructor.export")}
          </button>
          <button
            type="button"
            className={styles.jsonBtn}
            onClick={() => fileInputRef.current?.click()}
          >
            {t("constructor.import")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className={styles.hiddenInput}
            onChange={handleImport}
          />
          <LanguageSwitcher
            currentLang={i18n.language}
            onChangeLang={handleLanguageChange}
          />
        </div>
      </div>

      {importError && <div className={styles.error}>{importError}</div>}

      <div className={styles.tabContent}>
        {/* Topics tab */}
        {tab === "topics" && (
          <>
            <TopicChips
              topics={data.topics}
              selectedIndex={selectedTopicIndex}
              onSelect={setSelectedTopicIndex}
              onDelete={deleteTopic}
              onAdd={addTopic}
            />
            {selectedTopic ? (
              <>
                <input
                  className={styles.topicNameInput}
                  value={selectedTopic.name}
                  onChange={(e) => updateTopicName(e.target.value)}
                  placeholder={t("constructor.topicNamePlaceholder")}
                />
                <QuestionList
                  questions={selectedTopic.questions}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                  onAdd={addQuestion}
                  onCheck={(i) => setCheckQuestionIndex(i)}
                />
              </>
            ) : (
              <div className={styles.empty}>
                {t("constructor.emptyTopics")}
              </div>
            )}
          </>
        )}

        {/* Blitz tab */}
        {tab === "blitz" && (
          <>
            {data.blitzTasks.length === 0 ? (
              <div className={styles.empty}>
                {t("constructor.emptyBlitz")}
              </div>
            ) : (
              data.blitzTasks.map((task, i) => (
                <BlitzRoundAccordion
                  key={i}
                  task={task}
                  roundIndex={i}
                  defaultOpen={i === 0}
                  onUpdateItem={(itemIdx, item) =>
                    updateBlitzItem(i, itemIdx, item)
                  }
                  onDeleteItem={(itemIdx) => deleteBlitzItem(i, itemIdx)}
                  onAddItem={() => addBlitzItem(i)}
                  onDeleteRound={() => deleteBlitzRound(i)}
                />
              ))
            )}
            <button
              type="button"
              className={styles.addRoundBtn}
              onClick={addBlitzRound}
            >
              {t("constructor.addRound")}
            </button>
          </>
        )}

        {/* AI tab */}
        {tab === "ai" && (
          <>
            <div className={styles.aiSettings}>
              <div className={styles.aiSettingsRow}>
                <span className={styles.settingsLabel}>
                  {t("constructor.ai.apiKey")}
                </span>
                <input
                  type="password"
                  className={styles.apiKeyInput}
                  value={apiKeyValue}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={t("constructor.ai.apiKeyPlaceholder")}
                />
              </div>
              <div className={styles.aiSettingsRow}>
                <span className={styles.settingsLabel}>
                  {t("constructor.ai.generationLanguage")}
                </span>
                <input
                  className={styles.langInput}
                  value={genLanguage}
                  onChange={(e) => {
                    setGenLanguage(e.target.value);
                    setGenLanguageEdited(true);
                  }}
                />
              </div>
              <div className={styles.settingsHint}>
                {t("constructor.ai.generationLanguageHint")}
              </div>
            </div>

            <AITopicGenerator
              apiKey={apiKeyValue}
              language={genLanguage}
              onApply={applyTopics}
            />
            <AIQuestionGenerator
              apiKey={apiKeyValue}
              language={genLanguage}
              topicNames={data.topics.map((t) => t.name).filter(Boolean)}
              onApply={applyQuestions}
            />
            <AIBlitzGenerator
              apiKey={apiKeyValue}
              language={genLanguage}
              onApply={applyBlitzTasks}
            />
          </>
        )}
      </div>

      {/* Answer check modal */}
      {checkQuestion && (
        <AnswerCheckModal
          open={checkQuestionIndex != null}
          question={checkQuestion}
          apiKey={apiKeyValue}
          language={genLanguage}
          onClose={() => setCheckQuestionIndex(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run `tsc --noEmit` to verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/ConstructorPage.tsx src/pages/ConstructorPage.module.css
git commit -m "feat(constructor): assemble ConstructorPage with all tabs and components"
```

---

### Task 10: Full Build + Test Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: all tests PASS (existing + new)

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Run build**

Run: `npx vite build`
Expected: build succeeds

- [ ] **Step 4: Fix any issues found**

If any test/type/build errors, fix them and re-run.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix(constructor): address build/test issues"
```

---

### Task 11: Update plan-01-init.md

- [ ] **Step 1: Mark phases 8.2 and 8.3 as complete**

In `task/plan-01-init.md`, change all `- [ ]` checkboxes under 8.2 and 8.3 to `- [x]`.

- [ ] **Step 2: Commit**

```bash
git add task/plan-01-init.md
git commit -m "docs: mark Phase 8.2 and 8.3 as complete"
```
