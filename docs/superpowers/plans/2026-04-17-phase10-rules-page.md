# Phase 10: RulesPage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static rules page with zigzag layout, sticky sidebar, and live UI component illustrations.

**Architecture:** Section data array drives rendering. Each section has text (via i18n) and an optional illustration using existing components (`PlayerAvatar`, `Envelope`, `Sticker`, `ScoreFormula`, `AiCommentBubble`). Sidebar uses `IntersectionObserver` for active-section highlighting. Mobile: sidebar hidden, stacked layout (text on top, illustration below).

**Tech Stack:** React, CSS Modules, i18next, existing `src/components/` library.

---

### Task 1: i18n keys (ru + en)

**Files:**
- Modify: `src/i18n/ru.json`
- Modify: `src/i18n/en.json`

- [ ] **Step 1: Add rules section keys to ru.json**

Replace the existing `rules` block in `src/i18n/ru.json`:

```json
"rules": {
  "title": "Правила игры",
  "whatIs": {
    "title": "Что такое Loud Quiz?",
    "text": "Loud Quiz — командная викторина для вечеринок. Игроки надевают наушники с музыкой и не слышат друг друга. Капитан команды видит вопрос на экране и объясняет его жестами и мимикой. Каждый игрок должен самостоятельно понять вопрос и написать свой уникальный ответ.\n\nДля игры нужен один большой экран (телевизор или ноутбук) и мобильный телефон с наушниками у каждого игрока."
  },
  "round": {
    "title": "Обычный раунд",
    "text": "1. Один из игроков становится капитаном раунда — кто первый нажал кнопку.\n2. Капитан выбирает вопрос из таблицы заданий. Каждый вопрос им��ет стоимость от 100 до 200 очков.\n3. Все надевают наушники, включается музыка — теперь никто не слышит друг друга.\n4. Капитан читает вопрос и объясняет его жестами. Все игроки (включая капитана) пишут свои ответы.\n5. Ведущий или AI проверяет ответы: одинаковые объединяются, неверные отклоняются."
  },
  "scoring": {
    "title": "Подсчёт очков",
    "text": "Если все ответы верные и уникальные — команда получает максимум очков с бонусом за скорость. Чем быстрее ответили — тем больше бонус.\n\nЕсли кто-то ошибся или ответы совпали — бонус за время сгорает, очки начисляются только за каждый уникальный верный ответ.\n\nУ каждой команды есть карта джокера — одна на всю игру. Она удваивает очки за раунд. Используйте её с умом!"
  },
  "blitz": {
    "title": "Блиц-раунд",
    "text": "В блице капитан объясняет слово жестами первому игроку в цепочке. Тот понимает слово и объясняет его следующему — и так до последнего игрока. Последний в цепочке пишет ответ.\n\nЧем дальше по цепочке дошло слово — тем больше очков! Ответ проверяется автоматически: без учёта регистра, ё/е и пробелов."
  },
  "modes": {
    "title": "Режимы игры",
    "text": "— **Одна команда** — кооперативный режим. Цель — набрать как можно больше очков вместе.\n— **Две команды** — соревновательный режим. Команды играют по очереди, побеждает та, что наберёт больше.\n— **Ручной режим** — вопросы загружаются из подготовленного файла, ведущий оценивает ответы сам.\n— **AI-режим** — вопросы генерируются искусственным интеллектом, он же проверяет ответы."
  },
  "ai": {
    "title": "Игра с AI",
    "text": "В AI-режиме игроки сами предлагают темы для вопросов, а искусственный интеллект генерирует задания на их основе.\n\nAI автоматически проверяет ответы: оценивает правильность, группирует одинаковые по смыслу и оставляет комментарии к спорным ответам.\n\nЕсли вы не согласны с решением AI — любой ответ можно оспорить, и тогда ведущий оценит его вручную."
  },
  "constructor": {
    "title": "Редактор вопросов",
    "text": "Для ручного режима игры нужен файл с вопросами. Создать его можно в редакторе вопросов.\n\nВ редакторе можно:\n— Создавать темы и добавлять вопросы разной сложности (от 100 до 200 очков).\n— Добавлять блиц-задания — слова и словосочетания для цепочки объяснений (от 200 до 400 очков).\n— Экспортировать и импортировать файл вопросов в формате JSON.\n\nЕсли у вас есть API-ключ OpenRouter, редактор может сгенерировать вопросы с помощью AI: предложите темы, укажите количество вопросов и игроков — и AI создаст задания автоматически.",
    "link": "Открыть редактор вопросов"
  }
}
```

- [ ] **Step 2: Add rules section keys to en.json**

Replace the existing `rules` block in `src/i18n/en.json`:

```json
"rules": {
  "title": "Game Rules",
  "whatIs": {
    "title": "What is Loud Quiz?",
    "text": "Loud Quiz is a team-based party quiz game. Players put on headphones with music and can't hear each other. The team captain sees the question on screen and explains it using gestures and facial expressions. Each player must independently understand the question and write their own unique answer.\n\nAll you need is one big screen (TV or laptop) and a mobile phone with headphones for each player."
  },
  "round": {
    "title": "Standard Round",
    "text": "1. One player becomes the round captain — first to press the button.\n2. The captain picks a question from the task board. Each question has a value from 100 to 200 points.\n3. Everyone puts on headphones, music starts — now nobody can hear each other.\n4. The captain reads the question and explains it with gestures. All players (including the captain) write their answers.\n5. The host or AI checks the answers: duplicates are merged, wrong answers are rejected."
  },
  "scoring": {
    "title": "Scoring",
    "text": "If all answers are correct and unique — the team gets maximum points with a speed bonus. The faster everyone answers — the bigger the bonus.\n\nIf someone makes a mistake or answers overlap — the time bonus is lost, points are awarded only for each unique correct answer.\n\nEach team has a joker card — one per game. It doubles the points for a round. Use it wisely!"
  },
  "blitz": {
    "title": "Blitz Round",
    "text": "In blitz, the captain explains a word using gestures to the first player in the chain. That player understands it and explains it to the next one — and so on until the last player. The last player in the chain writes the answer.\n\nThe further down the chain the word travels — the more points! The answer is checked automatically: case-insensitive, ё/е equivalent, ignoring spaces."
  },
  "modes": {
    "title": "Game Modes",
    "text": "— **Single team** — cooperative mode. The goal is to score as many points as possible together.\n— **Two teams** — competitive mode. Teams take turns, the one with more points wins.\n— **Manual mode** — questions are loaded from a prepared file, the host evaluates answers.\n— **AI mode** — questions are generated by artificial intelligence, which also checks the answers."
  },
  "ai": {
    "title": "Playing with AI",
    "text": "In AI mode, players suggest topics for questions, and the AI generates tasks based on them.\n\nThe AI automatically checks answers: evaluates correctness, groups similar answers together, and leaves comments on borderline cases.\n\nIf you disagree with the AI's decision — any answer can be disputed, and the host will evaluate it manually."
  },
  "constructor": {
    "title": "Question Editor",
    "text": "For manual mode, you need a question file. You can create one in the question editor.\n\nIn the editor you can:\n— Create topics and add questions of varying difficulty (100 to 200 points).\n— Add blitz tasks — words and phrases for the explanation chain (200 to 400 points).\n— Export and import question files in JSON format.\n\nIf you have an OpenRouter API key, the editor can generate questions using AI: suggest topics, specify the number of questions and players — and the AI will create tasks automatically.",
    "link": "Open Question Editor"
  }
}
```

- [ ] **Step 3: Verify i18n keys are in sync**

Run:
```bash
node -e "
const ru = require('./src/i18n/ru.json');
const en = require('./src/i18n/en.json');
function getKeys(obj, prefix='') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const path = prefix ? prefix+'.'+k : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) keys.push(...getKeys(obj[k], path));
    else keys.push(path);
  }
  return keys;
}
const ruKeys = new Set(getKeys(ru));
const enKeys = new Set(getKeys(en));
const missingEn = [...ruKeys].filter(k => !enKeys.has(k));
const missingRu = [...enKeys].filter(k => !ruKeys.has(k));
if (missingEn.length) console.log('Missing in EN:', missingEn);
if (missingRu.length) console.log('Missing in RU:', missingRu);
if (!missingEn.length && !missingRu.length) console.log('All keys match');
"
```
Expected: `All keys match`

- [ ] **Step 4: Commit**

```bash
git add src/i18n/ru.json src/i18n/en.json
git commit -m "feat: i18n keys for rules page (7 sections, ru + en)"
```

---

### Task 2: Section data model and content array

**Files:**
- Create: `src/pages/rules/rulesContent.ts`

- [ ] **Step 1: Create section data model and content array**

```typescript
// src/pages/rules/rulesContent.ts

export interface RulesSection {
  id: string;
  titleKey: string;
  textKey: string;
  direction: "text-left" | "text-right" | "text-only";
  illustration: "avatars" | "envelopes" | "scoring" | "blitz-chain" | "modes" | "ai-review" | null;
  linkKey?: string;
  linkTo?: string;
}

export const rulesSections: RulesSection[] = [
  {
    id: "what-is",
    titleKey: "rules.whatIs.title",
    textKey: "rules.whatIs.text",
    direction: "text-left",
    illustration: "avatars",
  },
  {
    id: "round",
    titleKey: "rules.round.title",
    textKey: "rules.round.text",
    direction: "text-right",
    illustration: "envelopes",
  },
  {
    id: "scoring",
    titleKey: "rules.scoring.title",
    textKey: "rules.scoring.text",
    direction: "text-left",
    illustration: "scoring",
  },
  {
    id: "blitz",
    titleKey: "rules.blitz.title",
    textKey: "rules.blitz.text",
    direction: "text-right",
    illustration: "blitz-chain",
  },
  {
    id: "modes",
    titleKey: "rules.modes.title",
    textKey: "rules.modes.text",
    direction: "text-left",
    illustration: "modes",
  },
  {
    id: "ai",
    titleKey: "rules.ai.title",
    textKey: "rules.ai.text",
    direction: "text-right",
    illustration: "ai-review",
  },
  {
    id: "constructor",
    titleKey: "rules.constructor.title",
    textKey: "rules.constructor.text",
    direction: "text-only",
    illustration: null,
    linkKey: "rules.constructor.link",
    linkTo: "/constructor",
  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/pages/rules/rulesContent.ts
git commit -m "feat: rules section data model and content array"
```

---

### Task 3: Illustration components

**Files:**
- Create: `src/pages/rules/illustrations/AvatarsIllustration.tsx`
- Create: `src/pages/rules/illustrations/EnvelopesIllustration.tsx`
- Create: `src/pages/rules/illustrations/ScoringIllustration.tsx`
- Create: `src/pages/rules/illustrations/BlitzChainIllustration.tsx`
- Create: `src/pages/rules/illustrations/ModesIllustration.tsx`
- Create: `src/pages/rules/illustrations/AiReviewIllustration.tsx`
- Create: `src/pages/rules/illustrations/illustrations.module.css`

All illustrations are presentational wrappers around existing components. Each container constrains height and width so that the child components render correctly.

- [ ] **Step 1: Create shared CSS for illustration containers**

```css
/* src/pages/rules/illustrations/illustrations.module.css */

.container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-height: 280px;
  overflow: hidden;
}

.avatarsRow {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
}

.captainLabel {
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-align: center;
  margin-top: var(--spacing-xs);
}

.envelopesRow {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-end;
  flex-wrap: wrap;
  justify-content: center;
}

.envelopeWrap {
  width: 90px;
  height: 110px;
}

.scoringColumn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
}

.stickersRow {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
}

.stickerWrap {
  width: 120px;
  height: 140px;
}

.blitzChain {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  justify-content: center;
}

.chainArrow {
  font-size: var(--font-size-xl);
  color: var(--color-text-secondary);
}

.chainAnswer {
  font-family: var(--font-handwriting);
  font-size: var(--font-size-lg);
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
}

.modesGrid {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
  justify-content: center;
}

.modeCard {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-md);
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  min-width: 100px;
}

.modeIcon {
  font-size: var(--font-size-2xl);
}

.modeLabel {
  font-family: var(--font-display);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.aiReviewColumn {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  align-items: stretch;
  width: 100%;
  max-width: 320px;
}
```

- [ ] **Step 2: Create AvatarsIllustration**

```tsx
// src/pages/rules/illustrations/AvatarsIllustration.tsx
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./illustrations.module.css";

export function AvatarsIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.avatarsRow}>
        <div>
          <PlayerAvatar emoji="🎯" name="Captain" team="red" size="64px" />
          <div className={styles.captainLabel}>♚</div>
        </div>
        <PlayerAvatar emoji="🎧" name="Alice" team="red" size="52px" />
        <PlayerAvatar emoji="🎵" name="Bob" team="red" size="52px" />
        <PlayerAvatar emoji="🎶" name="Carol" team="red" size="52px" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create EnvelopesIllustration**

```tsx
// src/pages/rules/illustrations/EnvelopesIllustration.tsx
import { Envelope } from "@/components/Envelope/Envelope";
import styles from "./illustrations.module.css";

export function EnvelopesIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.envelopesRow}>
        <div className={styles.envelopeWrap}>
          <Envelope difficulty={100} paperColor="none" />
        </div>
        <div className={styles.envelopeWrap}>
          <Envelope difficulty={150} paperColor="none" open />
        </div>
        <div className={styles.envelopeWrap}>
          <Envelope difficulty={200} paperColor="none" />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create ScoringIllustration**

```tsx
// src/pages/rules/illustrations/ScoringIllustration.tsx
import { Sticker } from "@/components/Sticker/Sticker";
import { ScoreFormula } from "@/components/ScoreFormula/ScoreFormula";
import styles from "./illustrations.module.css";

export function ScoringIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.scoringColumn}>
        <div className={styles.stickersRow}>
          <div className={styles.stickerWrap}>
            <Sticker
              answerText="Гагарин"
              stampText="✓"
              stampColor="green"
              player={{ emoji: "🎧", name: "Alice", team: "red" }}
              hideAvatar
            />
          </div>
          <div className={styles.stickerWrap}>
            <Sticker
              answerText="Титов"
              stampText="✓"
              stampColor="green"
              player={{ emoji: "🎵", name: "Bob", team: "red" }}
              hideAvatar
            />
          </div>
          <div className={styles.stickerWrap}>
            <Sticker
              answerText="Космонавт"
              stampText="✗"
              stampColor="red"
              player={{ emoji: "🎶", name: "Carol", team: "red" }}
              hideAvatar
            />
          </div>
        </div>
        <ScoreFormula
          difficulty={150}
          correctCount={2}
          jokerActive={false}
          bonusTimeMultiplier={0}
          bonusTimeApplied={false}
          totalScore={300}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create BlitzChainIllustration**

```tsx
// src/pages/rules/illustrations/BlitzChainIllustration.tsx
import { PlayerAvatar } from "@/components/PlayerAvatar/PlayerAvatar";
import styles from "./illustrations.module.css";

export function BlitzChainIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.blitzChain}>
        <PlayerAvatar emoji="🎯" name="Captain" team="blue" size="48px" />
        <span className={styles.chainArrow}>→</span>
        <PlayerAvatar emoji="🎧" name="P1" team="blue" size="44px" />
        <span className={styles.chainArrow}>→</span>
        <PlayerAvatar emoji="🎵" name="P2" team="blue" size="44px" />
        <span className={styles.chainArrow}>→</span>
        <div className={styles.chainAnswer}>?</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create ModesIllustration**

```tsx
// src/pages/rules/illustrations/ModesIllustration.tsx
import styles from "./illustrations.module.css";

export function ModesIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.modesGrid}>
        <div className={styles.modeCard}>
          <span className={styles.modeIcon}>🤝</span>
          <span className={styles.modeLabel}>1 team</span>
        </div>
        <div className={styles.modeCard}>
          <span className={styles.modeIcon}>⚔️</span>
          <span className={styles.modeLabel}>2 teams</span>
        </div>
        <div className={styles.modeCard}>
          <span className={styles.modeIcon}>🤖</span>
          <span className={styles.modeLabel}>AI</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Create AiReviewIllustration**

```tsx
// src/pages/rules/illustrations/AiReviewIllustration.tsx
import { Sticker } from "@/components/Sticker/Sticker";
import { AiCommentBubble } from "@/components/AiCommentBubble/AiCommentBubble";
import styles from "./illustrations.module.css";

export function AiReviewIllustration() {
  return (
    <div className={styles.container}>
      <div className={styles.aiReviewColumn}>
        <div className={styles.stickerWrap}>
          <Sticker
            answerText="Марс"
            stampText="✓"
            stampColor="green"
            player={{ emoji: "🎧", name: "Alice", team: "red" }}
            hideAvatar
          />
        </div>
        <AiCommentBubble text="Марс — четвёртая планета, принято!" charDelayMs={0} />
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 9: Commit**

```bash
git add src/pages/rules/illustrations/
git commit -m "feat: rules page illustration components (6 sections)"
```

---

### Task 4: RulesSection component

**Files:**
- Create: `src/pages/rules/RulesSection.tsx`

- [ ] **Step 1: Create RulesSection component**

This component renders one section: title, text block, and optional illustration. It reads `direction` to decide zigzag placement. On mobile the direction is always stacked (text on top).

```tsx
// src/pages/rules/RulesSection.tsx
import { useTranslation } from "react-i18next";
import type { RulesSection as RulesSectionData } from "./rulesContent";
import { AvatarsIllustration } from "./illustrations/AvatarsIllustration";
import { EnvelopesIllustration } from "./illustrations/EnvelopesIllustration";
import { ScoringIllustration } from "./illustrations/ScoringIllustration";
import { BlitzChainIllustration } from "./illustrations/BlitzChainIllustration";
import { ModesIllustration } from "./illustrations/ModesIllustration";
import { AiReviewIllustration } from "./illustrations/AiReviewIllustration";
import styles from "../RulesPage.module.css";

const illustrationMap: Record<string, React.FC> = {
  avatars: AvatarsIllustration,
  envelopes: EnvelopesIllustration,
  scoring: ScoringIllustration,
  "blitz-chain": BlitzChainIllustration,
  modes: ModesIllustration,
  "ai-review": AiReviewIllustration,
};

export function RulesSectionBlock({ section }: { section: RulesSectionData }) {
  const { t } = useTranslation();
  const IllustrationComponent = section.illustration
    ? illustrationMap[section.illustration]
    : null;

  const textBlock = (
    <div className={styles.sectionText}>
      <h2 className={styles.sectionTitle}>{t(section.titleKey)}</h2>
      <div className={styles.sectionBody}>
        {t(section.textKey).split("\n").map((line, i) => (
          <p key={i}>{renderBold(line)}</p>
        ))}
      </div>
      {section.linkTo && section.linkKey && (
        <a
          href={section.linkTo}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sectionLink}
        >
          {t(section.linkKey)} ↗
        </a>
      )}
    </div>
  );

  if (section.direction === "text-only" || !IllustrationComponent) {
    return (
      <section id={section.id} className={styles.section}>
        {textBlock}
      </section>
    );
  }

  const imageBlock = (
    <div className={styles.sectionImage}>
      <IllustrationComponent />
    </div>
  );

  const directionClass = section.direction === "text-left" ? styles.textLeft : styles.textRight;

  return (
    <section
      id={section.id}
      className={`${styles.section} ${directionClass}`}
    >
      {textBlock}
      {imageBlock}
    </section>
  );
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors (RulesPage.module.css doesn't exist yet — CSS module types are generated, so this may pass or need Task 5 first; if it fails, proceed to Task 5 and come back)

- [ ] **Step 3: Commit**

```bash
git add src/pages/rules/RulesSection.tsx
git commit -m "feat: RulesSection component with illustration mapping"
```

---

### Task 5: RulesSidebar component

**Files:**
- Create: `src/pages/rules/RulesSidebar.tsx`

- [ ] **Step 1: Create RulesSidebar with IntersectionObserver**

```tsx
// src/pages/rules/RulesSidebar.tsx
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { rulesSections } from "./rulesContent";
import styles from "../RulesPage.module.css";

export function RulesSidebar() {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState(rulesSections[0]!.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    for (const section of rulesSections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <nav className={styles.sidebar}>
      <ul className={styles.sidebarList}>
        {rulesSections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`${styles.sidebarLink} ${activeId === section.id ? styles.sidebarLinkActive : ""}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {t(section.titleKey)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/rules/RulesSidebar.tsx
git commit -m "feat: RulesSidebar with IntersectionObserver active tracking"
```

---

### Task 6: RulesPage layout and CSS

**Files:**
- Modify: `src/pages/RulesPage.tsx`
- Create: `src/pages/RulesPage.module.css`

- [ ] **Step 1: Create RulesPage.module.css**

```css
/* src/pages/RulesPage.module.css */

/* ── Page layout ── */
.page {
  display: flex;
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--spacing-lg);
  gap: var(--spacing-xl);
}

.content {
  flex: 1;
  min-width: 0;
}

.pageTitle {
  font-family: var(--font-display);
  font-size: var(--font-size-2xl);
  margin-bottom: var(--spacing-xl);
}

/* ── Sidebar ── */
.sidebar {
  width: 200px;
  flex-shrink: 0;
  position: sticky;
  top: var(--spacing-lg);
  align-self: flex-start;
  max-height: calc(100vh - var(--spacing-lg) * 2);
  overflow-y: auto;
}

.sidebarList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.sidebarLink {
  display: block;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: var(--font-size-sm);
  transition: color 0.2s, background 0.2s;
  border-left: 3px solid transparent;
}

.sidebarLink:hover {
  color: var(--color-text);
  background: var(--color-bg-secondary);
}

.sidebarLinkActive {
  color: var(--color-primary);
  border-left-color: var(--color-primary);
  font-weight: 600;
}

/* ── Section ── */
.section {
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-xl);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  gap: var(--spacing-xl);
  align-items: center;
}

.section:last-child {
  border-bottom: none;
}

/* Zigzag directions — camelCase for CSS Modules */
.textLeft {
  flex-direction: row;
}

.textRight {
  flex-direction: row-reverse;
}

.sectionText {
  flex: 1;
  min-width: 0;
}

.sectionImage {
  flex: 0 0 300px;
  max-width: 300px;
  max-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.sectionTitle {
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  margin-bottom: var(--spacing-md);
}

.sectionBody p {
  margin: 0 0 var(--spacing-sm) 0;
  line-height: 1.6;
  color: var(--color-text);
}

.sectionLink {
  display: inline-block;
  margin-top: var(--spacing-md);
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s;
}

.sectionLink:hover {
  color: var(--color-primary-light);
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .page {
    padding: var(--spacing-md);
  }

  .sidebar {
    display: none;
  }

  .section {
    flex-direction: column !important;
    gap: var(--spacing-md);
  }

  .sectionImage {
    flex: none;
    max-width: 100%;
    width: 100%;
  }
}
```

- [ ] **Step 2: Update RulesPage.tsx**

Replace the entire content of `src/pages/RulesPage.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { rulesSections } from "./rules/rulesContent";
import { RulesSectionBlock } from "./rules/RulesSection";
import { RulesSidebar } from "./rules/RulesSidebar";
import styles from "./RulesPage.module.css";

export function RulesPage() {
  const { t } = useTranslation();

  return (
    <div className={styles.page}>
      <RulesSidebar />
      <main className={styles.content}>
        <h1 className={styles.pageTitle}>{t("rules.title")}</h1>
        {rulesSections.map((section) => (
          <RulesSectionBlock key={section.id} section={section} />
        ))}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit && npx vite build`
Expected: no errors

- [ ] **Step 4: Verify existing tests still pass**

Run: `npx vitest run`
Expected: all 526+ tests pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/RulesPage.tsx src/pages/RulesPage.module.css
git commit -m "feat: RulesPage with zigzag layout, sticky sidebar, illustrations"
```

---

### Task 7: Visual verification

**Files:** none (manual check)

- [ ] **Step 1: Start dev server and verify in browser**

Run: `npm run dev`

Open `http://localhost:5173/rules` in browser.

Verify:
- Page title "Правила игры" at top
- Sticky sidebar on the left with 7 links
- 7 sections with zigzag text/illustration alternation
- Section 1: PlayerAvatars (captain + 3 players)
- Section 2: Envelopes (100, 150 open, 200)
- Section 3: Stickers (accepted/rejected) + ScoreFormula
- Section 4: Blitz chain (avatars → arrows → answer)
- Section 5: Mode cards (single, dual, AI)
- Section 6: Sticker + AiCommentBubble
- Section 7: Text only + link to /constructor (opens new tab)
- Sidebar highlights correct section on scroll
- Clicking sidebar link scrolls to section smoothly

- [ ] **Step 2: Verify mobile layout**

Open browser DevTools, toggle device toolbar, set to 375×600.

Verify:
- Sidebar is hidden
- All sections are stacked: text on top, illustration below
- No horizontal overflow
- Illustrations fit within viewport width

- [ ] **Step 3: Fix any visual issues found**

Adjust CSS or illustration components as needed. If changes are made:

```bash
git add -u
git commit -m "fix: rules page visual adjustments"
```

---

### Task 8: Update plan-01-init.md

**Files:**
- Modify: `task/plan-01-init.md`

- [ ] **Step 1: Mark RulesPage as done in Phase 10**

In `task/plan-01-init.md`, change `- [ ] \`RulesPage\`` to `- [x] \`RulesPage\``.

- [ ] **Step 2: Commit**

```bash
git add task/plan-01-init.md
git commit -m "mark RulesPage done in Phase 10"
```
