# Phase 8.2–8.3: Question Constructor (Manual + AI)

## Overview

Full-featured question constructor at `/constructor`. Allows manual creation and AI-assisted generation of topics, questions, and blitz tasks. Produces a `QuestionsFile` JSON for use in gameplay.

## Layout

Tab-based single-column layout. Works on both desktop and mobile.

### Tabs

| Tab | Content |
|-----|---------|
| **Topics** | Topic chips, selected topic name editor, questions list |
| **Blitz** | Accordion of blitz rounds, each containing word items |
| **AI** | API key, topic generation, question generation, blitz generation |
| **JSON** | Export/import buttons (in tab bar, right-aligned) |

## Tab: Topics (Manual Mode)

### Topic chips

- Horizontal chips row at the top, wrapping on overflow.
- Each chip: topic name + delete button (x).
- Active chip highlighted (selected for editing).
- "+ Topic" chip at the end to add a new topic.
- Clicking a chip selects it and shows its questions below.

### Topic name editor

- Inline editable text field below chips showing the selected topic's name.

### Questions list

- Section label: "Questions (N)" where N is count.
- Each question row: text (left), difficulty number + action buttons (right).
- Action buttons per question:
  - **Check** (checkmark icon) — opens answer check modal (requires API key).
  - **Edit** (pencil icon) — inline edit mode for text and difficulty.
  - **Delete** (x icon) — removes the question.
- "+ Question" button at the bottom to add a new question.
- New question form: text input + difficulty selector (100–200, step 10).

## Tab: Blitz (Manual Mode)

### Blitz rounds accordion

- Each round is a collapsible section.
- Header: "Round N — M words" + delete button (x).
- Expanded body: list of blitz items, each with text + difficulty (200–400, step 10) + edit/delete buttons.
- "+ Word" button inside each round.
- "+ Round" button below all rounds.

## Tab: AI

### API Key

- Text input at the top of the AI tab.
- Value persisted to localStorage via `localPersistence.setApiKey()`.
- Masked display (password-style) with toggle visibility.

### Topic Generation

- **Suggestions textarea**: multi-line, one suggestion per line. Max 10 lines. Counter shows "N / 10".
- **Topic count**: numeric input.
- **Generate button**: calls `generateTopics()`.
- **Preview**: list of generated topics with `reason` text. "Apply" button.
- **Apply behavior**: replaces all existing topics and questions with a warning hint ("Will replace all current topics and questions").

### Question Generation

- **Players count**: numeric input, max 10.
- **Questions per topic**: numeric input.
- **Generate button**: calls `generateQuestions()` for all topics currently on the Topics tab.
- **Apply behavior**: replaces all questions in all topics.
- Hint: "Generates questions for all topics. Will replace current questions."

### Blitz Generation

- **Rounds count**: numeric input.
- **Words per round**: numeric input.
- **Generate button**: calls `generateBlitzTasks()`. Uses `pastTasks` from localStorage.
- **Apply behavior**: replaces all blitz tasks.

### Loading state

- Spinner + text message ("Generating topics...") replaces the form content during AI request.
- Form inputs disabled while loading.

### Error state

- Error bar with message + "Retry" button.
- Shown in place of loading state on failure.

## Answer Check Modal

Triggered by the check button (checkmark) on any question row.

### Modal content

1. **Title**: "Check: «{question text}»"
2. **Answers textarea**: multi-line, one answer per line. Max 10 lines. Counter shows "N / 10".
   - Pre-filled from `question.acceptedAnswers` if available.
3. **Check button**: calls `checkAnswers()`.
   - Player names are generated from i18n template: `constructor.templateNames` (comma-separated list of 10 names per locale).
   - Each line in the textarea is paired with a template name for the AI request.
4. **Results display**:
   - Each answer: "{TemplateName}: {answer}" — accepted/rejected badge.
   - Group numbers shown for grouped answers.
   - AI comment at the bottom.
5. **Close button**.

### Template names (i18n)

```
ru: "Иван,Мария,Алексей,Ольга,Дмитрий,Анна,Сергей,Елена,Николай,Татьяна"
en: "John,Sarah,Michael,Emma,David,Anna,James,Olivia,Robert,Sophie"
```

Stored as `constructor.templateNames` in locale files.

## JSON Export/Import

Located as a button group in the tab bar (right side).

### Export

- Downloads a `.json` file containing the current `QuestionsFile`.
- Filename: `loud-quiz-questions.json`.

### Import

- File picker accepting `.json`.
- Validates the file structure against `QuestionsFile` type.
- On success: replaces all current data (topics, questions, blitz tasks).
- On validation failure: shows error message, does not import.

## Data Persistence

- Constructor state auto-saved to localStorage via `localPersistence.setConstructorData()` on every change.
- On page load, restored from `localPersistence.getConstructorData()`.
- API key stored separately via `localPersistence.setApiKey()`.

## Component Architecture

All components are props-only (no direct store access per project conventions).

### Page component

- `ConstructorPage` — manages local state (`QuestionsFile`), renders tabs, handles persistence.

### Shared/reusable components

- `TopicChips` — topic chip bar with add/select/delete.
- `QuestionList` — list of questions with actions.
- `QuestionForm` — inline form for adding/editing a question (text + difficulty).
- `BlitzRoundAccordion` — collapsible blitz round with items.
- `BlitzItemForm` — inline form for adding/editing a blitz item.
- `AITopicGenerator` — topic generation form + preview + apply.
- `AIQuestionGenerator` — question generation form + apply.
- `AIBlitzGenerator` — blitz generation form + apply.
- `AnswerCheckModal` — modal for answer checking.
- `AILoadingState` — spinner + message.
- `AIErrorState` — error message + retry button.

### State management

Local `useState` in `ConstructorPage` — no Zustand store needed. The page owns the `QuestionsFile` state and passes it down as props. Callbacks bubble changes up.

## i18n Keys

Namespace: `constructor.*`

```
constructor.title
constructor.tabs.topics
constructor.tabs.blitz
constructor.tabs.ai
constructor.addTopic
constructor.addQuestion
constructor.addWord
constructor.addRound
constructor.questionCount (with interpolation)
constructor.roundWords (with interpolation)
constructor.difficulty
constructor.export
constructor.import
constructor.importError
constructor.templateNames

constructor.ai.apiKey
constructor.ai.apiKeyPlaceholder
constructor.ai.topicGeneration
constructor.ai.suggestions
constructor.ai.suggestionsHint
constructor.ai.topicCount
constructor.ai.generate
constructor.ai.result
constructor.ai.apply
constructor.ai.replaceWarning.topics
constructor.ai.replaceWarning.questions
constructor.ai.replaceWarning.blitz
constructor.ai.questionGeneration
constructor.ai.playersCount
constructor.ai.questionsPerTopic
constructor.ai.blitzGeneration
constructor.ai.roundsCount
constructor.ai.wordsPerRound
constructor.ai.loading.topics
constructor.ai.loading.questions
constructor.ai.loading.blitz
constructor.ai.retry

constructor.answerCheck.title
constructor.answerCheck.answersLabel
constructor.answerCheck.answersHint
constructor.answerCheck.check
constructor.answerCheck.close
constructor.answerCheck.accepted
constructor.answerCheck.rejected
constructor.answerCheck.group
```

## Validation Rules

- Topic name: non-empty string, trimmed.
- Question text: non-empty string.
- Question difficulty: 100–200, step 10.
- Blitz item text: non-empty string.
- Blitz item difficulty: 200–400, step 10.
- Blitz round: 3–5 items. "+ Word" button hidden when round has 5 items. Rounds with fewer than 3 items show a warning hint but are not blocked (allows work-in-progress).
- Suggestions textarea: max 10 lines.
- Answers textarea: max 10 lines.
- Players count: 1–10.
- API key: non-empty for AI operations.
- Import JSON: must match `QuestionsFile` structure.
