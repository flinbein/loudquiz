# Home Page Design — Loud Quiz

**Дата:** 2026-04-18
**Фаза плана:** 10 (Полировка) — пункт «дизайн главной страницы»
**Маршрут:** `/`
**Текущее состояние:** `src/pages/HomePage.tsx` — голый stub с четырьмя ссылками.

## Цель

Переработать главную страницу в полноценный hero-экран в духе arcade-neon, который:

- приоритизирует сценарий «host у большого экрана запускает новую игру»,
- остаётся рабочим на мобильных (player, случайно попавший на `/`),
- обнаруживает сохранённую сессию и предлагает её продолжить,
- задаёт контрастный визуальный тон относительно «бумажного» геймплея (конверты, карточки, стикеры).

## Решения

| Аспект | Решение |
|---|---|
| Адресат | Host-first, адаптивно под мобильный. |
| Объём контента | Hero + блок «3 шага» + вторичные действия (не лендинг). |
| Настроение | Arcade neon: тёмный фон, светящаяся типографика, красный/синий командные акценты. |
| Тема | Главная всегда тёмная. Переключатель темы на странице отсутствует, глобальный `data-theme` не трогаем. |
| Шапка | Прозрачная, только переключатель языка и fullscreen-кнопка в правом верхнем углу. |
| Раскладка | Асимметрия с иерархией: слева hero, справа вертикальный стек действий, снизу полоса «3 шага». |
| Continue-сессия | Primary-кнопка превращается в «Продолжить» с ярлыком фазы под словом, если `phase ∉ {lobby, finale}`. Вторичная ссылка «Новая игра» появляется рядом с «Редактор/Правила». Все клики — без подтверждений. |
| Движение | Фоновые неон-пятна перемещаются и пульсируют; primary-кнопка дышит свечением. Всё отключается при `prefers-reduced-motion: reduce`. |

## Раскладка

**Десктоп (≥ 768px):**

```
┌──────────────────────────────────────────────────────────┐
│                                            [RU|EN]  [⛶] │  прозрачная шапка
├──────────────────────────────────────────────────────────┤
│                                                          │
│   LOUD                 ┌──────────────────────┐          │
│   QUIZ                 │  ▸ НОВАЯ ИГРА        │          │  primary (или «Продолжить»)
│                        └──────────────────────┘          │
│   Вечеринка,           ┌──────────────────────┐          │
│   наушники, жесты      │    ПРИСОЕДИНИТЬСЯ    │          │  outline
│                        └──────────────────────┘          │
│                          Редактор · Правила              │  текстовые ссылки
│                                                          │
├──────────────────────────────────────────────────────────┤
│   ①  СОБЕРИ       ②  НАДЕНЬ        ③  ОБЪЯСНИ            │  3 шага
│      КОМАНДУ         НАУШНИКИ         ЖЕСТАМИ            │
└──────────────────────────────────────────────────────────┘
```

**Мобильный (< 768px):**

Всё стэкается в один столбец, кнопки на всю ширину, шаги идут столбиком.

## Состояния `primary + tertiary`

| Условие | Primary CTA | Текстовые ссылки |
|---|---|---|
| `loadGameState() === null` или `phase ∈ {lobby, finale}` | `▸ Новая игра` → `/setup` | `Редактор · Правила` |
| Активная сессия | `▸ Продолжить`<br>`· Идёт раунд · 5 / 12` → `/play?room={roomId}` | `Редактор · Правила · Новая игра` |

«Новая игра» как текстовая ссылка при активной сессии: `clearGameState()` + `clearRoomId()` → `/setup`.

Outline `Присоединиться` → `/play` — без изменений.

## Компоненты и файловая структура

```
src/pages/
  HomePage.tsx                    ← оркестратор, только композиция и навигация
  HomePage.module.css             ← локальная тёмная палитра + неон-токены + фон
  home/
    HomeTopBar.tsx                ← LanguageSwitcher + fullscreen-кнопка
    HomeTopBar.module.css
    HomeHero.tsx                  ← логотип + слоган
    HomeHero.module.css
    HomeActions.tsx               ← primary + outline + текстовые ссылки
    HomeActions.module.css
    HomeSteps.tsx                 ← полоса «3 шага»
    HomeSteps.module.css
    useHomeSession.ts             ← хук-селектор {fresh | resume}
    phaseLabel.ts                 ← чистая функция GameState → строка
    phaseLabel.test.ts
    useHomeSession.test.ts
    HomeActions.test.tsx
    HomeActions.stories.tsx
    HomePage.stories.tsx
```

Все компоненты — props-driven, без обращений к Zustand (конвенция проекта).

## Контракты

### `useHomeSession()`

```ts
type HomeSession =
  | { kind: "fresh" }
  | { kind: "resume"; phase: GamePhase; phaseLabel: string; roomId: string };

function useHomeSession(): HomeSession;
```

- Читает `sessionStorage` один раз при монтировании (без подписки).
- Возвращает `fresh`, если `loadGameState()` вернул `null`, либо `roomId` отсутствует, либо `phase ∈ {lobby, finale}`.
- Иначе возвращает `resume` с интернационализированным `phaseLabel`.

### `phaseLabel(state, t)`

Чистая функция:

```ts
function phaseLabel(state: GameState, t: TFunction): string {
  const { phase } = state;
  if (phase.startsWith("topics-")) return t("home.resumePhase.topics");
  if (phase.startsWith("round-")) {
    const current = state.history.filter(r => r.type === "round").length + 1;
    const total = state.topics.reduce((n, t) => n + t.questions.length, 0);
    return t("home.resumePhase.round", { current, total });
  }
  if (phase.startsWith("blitz-")) {
    const current = state.history.filter(r => r.type === "blitz").length + 1;
    const total = state.blitzTasks.length;
    return t("home.resumePhase.blitz", { current, total });
  }
  return "";
}
```

- **Сыграно** считаем по `history`.
- **Текущий номер** = `played + 1` (текущий раунд/блиц ещё не в `history`).
- **Всего раундов** = суммарное количество вопросов во всех темах.
- **Всего блицев** = `blitzTasks.length`.

### `HomeActions`

```ts
interface HomeActionsProps {
  session: HomeSession;
  onStartNew(): void;
  onResume(roomId: string): void;
  onJoin(): void;
  onClearAndStartNew(): void;
  onConstructor(): void;
  onRules(): void;
}
```

Компонент сам решает, какой primary-вариант рендерить, на основе `session.kind`.

### `HomePage`

```tsx
export function HomePage() {
  const session = useHomeSession();
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <HomeTopBar />
      <main className={styles.main}>
        <HomeHero />
        <HomeActions
          session={session}
          onStartNew={() => navigate("/setup")}
          onResume={(roomId) => navigate(`/play?room=${roomId}`)}
          onJoin={() => navigate("/play")}
          onClearAndStartNew={() => {
            clearGameState();
            clearRoomId();
            navigate("/setup");
          }}
          onConstructor={() => navigate("/constructor")}
          onRules={() => navigate("/rules")}
        />
      </main>
      <HomeSteps />
    </div>
  );
}
```

## Визуальная система

### Локальная палитра (переопределения в `.page`)

```css
.page {
  --color-bg: #0a0a14;
  --color-bg-elev: #12121e;
  --color-text: #e8e8f0;
  --color-text-secondary: rgba(232, 232, 240, 0.6);
  --color-text-muted: rgba(232, 232, 240, 0.4);

  --neon-red: var(--color-team-red);
  --neon-red-glow: rgba(229, 57, 53, 0.55);
  --neon-blue: var(--color-team-blue);
  --neon-blue-glow: rgba(30, 136, 229, 0.55);
}
```

CSS-переменные наследуются вниз — `LanguageSwitcher` и любые дочерние компоненты видят локальную тёмную палитру независимо от глобальной темы.

### Типографика

| Элемент | Шрифт | Размер | Вес |
|---|---|---|---|
| `LOUD QUIZ` hero | Tektur (`--font-display`) | `clamp(3rem, 8vw, 6rem)` | 800 |
| Слоган | Tektur | `clamp(0.8rem, 1.2vw, 1rem)`, letter-spacing 3px, uppercase | 400 |
| Primary CTA | Tektur | 1.25rem, letter-spacing 2px | 800 |
| Phase label (в primary) | Tektur | 0.75rem, opacity 0.75 | 400 |
| Outline CTA | Tektur | 1rem | 600 |
| Text links | Tektur | 0.875rem, uppercase, letter-spacing 1px | 400 |
| Steps | Tektur | 0.75rem, uppercase, letter-spacing 2px | 600 |

`Marck Script` на главной не используется — бумажный почерк ломает arcade-эстетику.

### Фон и анимация

```css
.page {
  position: relative;
  overflow: hidden;
  background: var(--color-bg);
}

.page::before,
.page::after {
  content: "";
  position: absolute;
  pointer-events: none;
  border-radius: 50%;
  filter: blur(80px);
  will-change: translate, scale;
}

.page::before {
  width: 55vmin; aspect-ratio: 1;
  top: 10%; left: 5%;
  background: radial-gradient(circle, var(--neon-red-glow), transparent 65%);
  animation: orbitRed 24s ease-in-out infinite, pulseRed 7s ease-in-out infinite;
}

.page::after {
  width: 50vmin; aspect-ratio: 1;
  bottom: 10%; right: 5%;
  background: radial-gradient(circle, var(--neon-blue-glow), transparent 65%);
  animation: orbitBlue 28s ease-in-out infinite, pulseBlue 9s ease-in-out infinite;
}

@keyframes orbitRed {
  0%   { translate:  0vw   0vh; }
  25%  { translate:  8vw   4vh; }
  50%  { translate:  4vw  10vh; }
  75%  { translate: -4vw   6vh; }
  100% { translate:  0vw   0vh; }
}

@keyframes orbitBlue {
  0%   { translate:  0vw   0vh; }
  25%  { translate: -6vw  -8vh; }
  50%  { translate:-10vw  -2vh; }
  75%  { translate: -2vw   6vh; }
  100% { translate:  0vw   0vh; }
}

@keyframes pulseRed  { 0%, 100% { scale: 1; } 50% { scale: 1.15; } }
@keyframes pulseBlue { 0%, 100% { scale: 1; } 50% { scale: 1.12; } }
```

Используются независимые свойства `translate:` и `scale:` — они не конфликтуют между разными animations, в отличие от общего `transform:`. Периоды 24s/28s/7s/9s намеренно некратны, чтобы композиция не повторялась очевидно.

Primary CTA дышит свечением:

```css
@keyframes ctaPulse {
  0%, 100% { box-shadow: 0 0 24px var(--neon-red-glow); }
  50%      { box-shadow: 0 0 36px var(--neon-red-glow); }
}
.primaryCta { animation: ctaPulse 3s ease-in-out infinite; }
```

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  .page::before, .page::after, .primaryCta { animation: none; }
}
```

Все анимации отключаются, остаётся статический фон с теми же пятнами.

### Раскладка (Grid)

```css
.page {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
}
.main {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  align-items: center;
  gap: clamp(2rem, 6vw, 6rem);
  padding: clamp(2rem, 6vw, 5rem);
  max-width: 1280px; margin: 0 auto; width: 100%;
}
@media (max-width: 768px) {
  .main {
    grid-template-columns: 1fr;
    gap: 2rem;
    padding: 1.5rem 1.25rem;
    text-align: center;
  }
  .hero { align-items: center; }
  .actions { align-items: stretch; }
  .steps { flex-direction: column; gap: 0.5rem; }
}
```

## i18n

Новые ключи (все — под `home.*`). Уже существующие `home.newGame`, `home.joinGame`, `home.constructor`, `home.rules` переиспользуются.

```json
"home": {
  "newGame": "Новая игра",
  "joinGame": "Присоединиться",
  "constructor": "Редактор",
  "rules": "Правила",
  "resume": "Продолжить",
  "resumePhase": {
    "topics": "Выбор тем",
    "round": "Идёт раунд · {{current}} / {{total}}",
    "blitz": "Идёт блиц · {{current}} / {{total}}"
  },
  "slogan": "Вечеринка, наушники, жесты",
  "steps": {
    "one": "Собери команду",
    "two": "Надень наушники",
    "three": "Объясни жестами"
  }
}
```

Английские переводы:

```json
"home": {
  "resume": "Continue",
  "resumePhase": {
    "topics": "Picking topics",
    "round": "Round in progress · {{current}} / {{total}}",
    "blitz": "Blitz in progress · {{current}} / {{total}}"
  },
  "slogan": "A party with headphones and gestures",
  "steps": {
    "one": "Gather your team",
    "two": "Put on headphones",
    "three": "Explain with gestures"
  }
}
```

## Доступность

- `<main>` для основного контента, `<footer>` для полосы «3 шага», `<nav>` для блока действий.
- Все action-элементы — нативные `<button>` (кроме `Link` у роутов).
- `:focus-visible` с outline 2px `var(--neon-red)` на всех кнопках и ссылках.
- Primary CTA с фазой: `aria-label` собирается из двух строк — «Продолжить. Идёт раунд, 5 из 12».
- Контраст: текст `#e8e8f0` на `#0a0a14` ≈ 18:1. Текст на красной кнопке — белый, ≈ 5.5:1 (AA large). Mute-текст проверить отдельно в браузере.
- `prefers-reduced-motion: reduce` отключает все анимации.
- Fullscreen-кнопка скрывается, если `document.fullscreenEnabled === false` (iOS Safari).

## Тестирование

**Vitest / Testing Library:**

- `useHomeSession.test.ts` — 6 кейсов:
  - нет `gameState` → `fresh`;
  - нет `roomId` → `fresh`;
  - `phase === lobby` → `fresh`;
  - `phase === finale` → `fresh`;
  - `round-active` с историей → `resume` с корректным `current/total`;
  - `blitz-active` с историей → `resume` с корректным `current/total`.
- `phaseLabel.test.ts` — 3 группы ярлыков + interpolation + edge cases (пустая история, один вопрос).
- `HomeActions.test.tsx` — проверка рендера для `fresh` и `resume`, клики вызывают правильные колбэки.

**Ladle stories:**

- `HomePage.stories.tsx`: `fresh`, `resume-round`, `resume-blitz`, `resume-topics`.
- `HomeActions.stories.tsx`: `fresh`, `resume-round`, `resume-blitz`.

**Ручная проверка:**

- 1366×768 host, 375×600 player (из plan-01-init).
- Переключение языка RU↔EN обновляет все тексты.
- Fullscreen-кнопка работает на Chrome/Firefox/Edge; тихо деградирует на iOS Safari.
- Возврат на `/` после F5 во время `round-*` — видно «Продолжить · Идёт раунд · N / M».
- Возврат на `/` во время `lobby` — видно «Новая игра» (без «Продолжить»).
- Клик «Новая игра» при активной сессии — `sessionStorage` очищен, переход на `/setup`.
- Проверка `prefers-reduced-motion: reduce` через DevTools — анимации остановлены, страница выглядит статично.
- Визуальная плавность фоновых пятен на мид-рейндж Android (Chrome). При лаге — уменьшить blur или оставить только одну пару keyframes.

## Не входит в скоп

- Страница `/setup` (редактор настроек новой игры) — не изменяется.
- Страница `/play` (вход по коду) — не изменяется.
- Переключатель темы в шапке — не добавляется (главная всегда тёмная).
- Сохранение состояния кнопки fullscreen между сессиями — не требуется.
- Анимация перехода между `/` и другими маршрутами — не входит в эту задачу.
