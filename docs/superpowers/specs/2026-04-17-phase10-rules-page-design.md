# Phase 10: RulesPage Design

## Overview

Static rules page for new players. Zigzag layout with sticky sidebar navigation. Uses existing UI components from `src/components/` for illustrations.

## Architecture

### Files

| File | Purpose |
|---|---|
| `src/pages/rules/rulesContent.ts` | Array of section definitions (id, illustration flag, direction). Text via `t()` keys |
| `src/pages/rules/RulesSection.tsx` | Single section component (zigzag or text-only) |
| `src/pages/rules/RulesSidebar.tsx` | Sticky sidebar with section links |
| `src/pages/RulesPage.tsx` | Assembles sidebar + section list |
| `src/pages/RulesPage.module.css` | Layout, zigzag, media queries |

### Layout

- **Desktop (>768px):** Sticky sidebar left + zigzag content right
- **Mobile (<=768px):** Sidebar hidden. Always text on top, illustration below (no zigzag)

### Illustration containers

All illustration containers have constrained `max-height` and `max-width`. Components from `src/components/` require a container with explicit height — every illustration wrapper enforces this.

## Sections

### 1. what-is — Что такое Loud Quiz?

**Direction:** text-left, image-right

**Content (ru):**
Loud Quiz — командная викторина для вечеринок. Игроки надевают наушники с музыкой и не слышат друг друга. Капитан команды видит вопрос на экране и объясняет его жестами и мимикой. Каждый игрок должен самостоятельно понять вопрос и написать свой уникальный ответ.

Для игры нужен один большой экран (телевизор или ноутбук) и мобильный телефон с наушниками у каждого игрока.

**Illustration:** Several `PlayerAvatar` components — one marked as captain, others as regular players.

### 2. round — Обычный раунд

**Direction:** text-right, image-left

**Content (ru):**
1. Один из игроков становится капитаном раунда — кто первый нажал кнопку.
2. Капитан выбирает вопрос из таблицы заданий. Каждый вопрос имеет стоимость от 100 до 200 очков.
3. Все надевают наушники, включается музыка — теперь никто не слышит друг друга.
4. Капитан читает вопрос и объясняет его мимикой и жестами. Все игроки (включая капитана) пишут свои ответы.
5. Ведущий или AI проверяет ответы: одинаковые объединяются, неверные отклоняются.

**Illustration:** `TaskView` with several `Envelope` components of different difficulties (100, 150, 200). Static display, no interaction.

### 3. scoring — Подсчёт очков

**Direction:** text-left, image-right

**Content (ru):**
Если все ответы верные и уникальные — команда получает максимум очков с бонусом за скорость. Чем быстрее ответили — тем больше бонус.

Если кто-то ошибся или ответы совпали — бонус за время сгорает, очки начисляются только за каждый уникальный верный ответ.

У каждой команды есть карта джокера — одна на всю игру. Она удваивает очки за раунд. Используйте её с умом!

**Illustration:** Several `Sticker` components showing accepted/rejected evaluations + `ScoreFormula` component showing a sample calculation.

### 4. blitz — Блиц-раунд

**Direction:** text-right, image-left

**Content (ru):**
В блице капитан объясняет слово жестами первому игроку в цепочке. Тот понимает слово и объясняет его следующему — и так до последнего игрока. Последний в цепочке пишет ответ.

Чем дальше по цепочке дошло слово — тем больше очков! Ответ проверяется автоматически: без учёта регистра, ё/е и пробелов.

**Illustration:** Chain of `PlayerAvatar` components connected with arrows: Captain → Player 1 → Player 2 → Player 3 (answer input). Custom layout, not an existing component.

### 5. modes — Режимы игры

**Direction:** text-left, image-right

**Content (ru):**
- **Одна команда** — кооперативный режим. Цель — набрать как можно больше очков вместе.
- **Две команды** — соревновательный режим. Команды играют по очереди, побеждает та, что наберёт больше.
- **Ручной режим** — вопросы загружаются из подготовленного файла, ведущий оценивает ответы сам.
- **AI-режим** — вопросы генерируются искусственным интеллектом, он же проверяет ответы.

**Illustration:** Three styled cards/badges representing modes (single, dual, AI). Simple custom layout — not an existing component.

### 6. ai — Игра с AI

**Direction:** text-right, image-left

**Content (ru):**
В AI-режиме игроки сами предлагают темы для вопросов, а искусственный интеллект генерирует задания на их основе.

AI автоматически проверяет ответы: оценивает правильность, группирует одинаковые по смыслу и оставляет комментарии к спорным ответам.

Если вы не согласны с решением AI — любой ответ можно оспорить, и тогда ведущий оценит его вручную.

**Illustration:** `Sticker` components with accepted/rejected marks + `AiCommentBubble` component showing a sample AI comment.

### 7. constructor — Редактор вопросов

**Direction:** text-only (no illustration)

**Content (ru):**
Для ручного режима игры нужен файл с вопросами. Создать его можно в редакторе вопросов.

В редакторе можно:
- Создавать темы и добавлять вопросы разной сложности (от 100 до 200 очков).
- Добавлять блиц-задания — слова и словосочетания для цепочки объяснений (от 200 до 400 очков).
- Экспортировать и импортировать файл вопросов в формате JSON.

Если у вас есть API-ключ OpenRouter, редактор может сгенерировать вопросы с помощью AI: предложите темы, укажите количество вопросов и игроков — и AI создаст задания автоматически.

**Link:** `<a href="/constructor" target="_blank">` — opens constructor in new tab.

## i18n Keys

All text under `rules.*` namespace:

```
rules.whatIs.title
rules.whatIs.text

rules.round.title
rules.round.text

rules.scoring.title
rules.scoring.text

rules.blitz.title
rules.blitz.text

rules.modes.title
rules.modes.text

rules.ai.title
rules.ai.text

rules.constructor.title
rules.constructor.text
rules.constructor.link
```

Both `ru.json` and `en.json` must be updated.

## Responsive Breakpoints

| Breakpoint | Sidebar | Content layout |
|---|---|---|
| >768px | Sticky sidebar visible | Zigzag (text-left/text-right alternating) |
| <=768px | Hidden | Stacked: text on top, illustration below |

## Dependencies

Uses existing components only — no new npm packages:
- `PlayerAvatar` — sections 1, 4
- `Envelope` — section 2
- `TaskView` — section 2 (optional, may use standalone Envelopes)
- `Sticker` — sections 3, 6
- `ScoreFormula` — section 3
- `AiCommentBubble` — section 6
