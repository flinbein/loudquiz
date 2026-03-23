# Screenshot Generator

Скрипт для автоматической генерации скриншотов всех состояний игры LoudQuiz.

## Запуск

```bash
npm run screenshot
```

Скриншоты сохраняются в `/screenshots/`. Если скриншот уже существует, он пропускается — генерируются только недостающие. Чтобы пересоздать скриншоты, удалите нужные файлы и запустите повторно.

## Что генерирует

Каждый сценарий снимается в двух темах (light / dark). Итого ~148 скриншотов:

- **host** — экран ведущего, 1920×1080
- **player** — экран игрока (мобильный), 400×700
- **home** — главная страница, 1920×1080

Имена файлов: `{фаза}_{вариант}_{view}_{theme}.png`

## Структура

```
scripts/screenshots/
  runner.ts          — Раннер: Vite + Puppeteer + обход сценариев + отчёт
  types.ts           — Типы: ScreenshotScenario, MockHostState, MockPlayerState
  stateFactory.ts    — Фабрика мок-состояний (игроки, настройки, таймеры и т.д.)
  scenarios/         — Файлы сценариев, по одному на группу фаз
```

## Добавление нового сценария

1. Создайте `.ts` файл в `scenarios/` (или добавьте в существующий)
2. Экспортируйте массив `ScreenshotScenario[]`
3. Готово — раннер автоматически подхватит все `.ts` файлы из папки

Пример минимального сценария:

```ts
import type { ScreenshotScenario } from "../types";
import { makeFullState, makeDefaultSettings } from "../stateFactory";

export const myScenarios: ScreenshotScenario[] = [
  {
    name: "my-phase_variant_host",
    view: "host",
    mockHost: {
      gameState: makeFullState("lobby", { players: [] }),
      settings: makeDefaultSettings(),
    },
  },
];
```

## Как это работает

### Мок-инъекция

Приложение не подключается к бекенду. Вместо этого:

1. Puppeteer открывает страницу (`/MOCK123/host` или `/MOCK123`)
2. После загрузки DOM — инжектит мок-данные в `window.__MOCK_HOST_STATE__` / `window.__MOCK_PLAYER_STATE__` через `page.evaluate`
3. Dispatch-ит событие `__applyMock`
4. React `useEffect` в `HostPage` / `PlayerPage` ловит событие, читает данные с `window` и вызывает все нужные `setState`
5. React ставит `window.__MOCK_APPLIED__ = true` — раннер ждёт этот флаг перед скриншотом

### Почему не `evaluateOnNewDocument`

`evaluateOnNewDocument` (инъекция ДО загрузки страницы) ненадёжен:
- CDP-сериализация сложных объектов может молча не доставить данные
- tsx (esbuild) трансформирует функции в коллбэке и добавляет хелпер `__name`, которого нет в браузере

Поэтому мок инжектится ПОСЛЕ загрузки через `page.evaluate` со строкой JS-кода + событие `__applyMock`.

### Таймеры

`timerAt(seconds)` из `stateFactory.ts` создаёт `{ endsAt: Date.now() + seconds * 1000 }`. Проблема: между созданием объекта и рендером в браузере проходит время, таймер «уехал бы».

Решение: при инъекции мока в браузере пересчитывается `drift = browserNow - serverNow`, и `endsAt` сдвигается на этот drift. Таймер всегда показывает заданное количество секунд.

### Прогрев Vite

Перед первым скриншотом раннер делает «прогревочный» запрос к `/` с `waitUntil: "networkidle0"`. Без этого первая страница грузится слишком долго (Vite компилирует все модули), и мок не успевает примениться.

### Анимации

CSS-анимации и transition отключаются через инжекцию `<style>` с `animation-duration: 0s !important`. Framer Motion использует JS-анимации — они могут проскочить за 300ms ожидания после мока.

### Завершение Vite на Windows

`vite.kill()` не убивает дочерние процессы при `shell: true` на Windows. Раннер использует `taskkill /pid ... /T /F` для корректного завершения.

## Мок-данные

### HostPage (`window.__MOCK_HOST_STATE__`)

| Поле | Тип | Когда нужно |
|------|-----|-------------|
| `gameState` | `FullGameState` | Всегда |
| `settings` | `GameSettings` | Всегда |
| `questionsPreview` | `QuestionsFile` | question-setup (загруженный JSON) |
| `reviewGroups` | `AnswerGroup[]` | round-review |

### PlayerPage (`window.__MOCK_PLAYER_STATE__`)

| Поле | Тип | Когда нужно |
|------|-----|-------------|
| `gameState` | `PublicGameState` | Всегда |
| `playerName` | `string` | Всегда — определяет "кто я" |
| `localRole` | `"player" \| "spectator"` | Всегда |
| `captainInfo` | `CaptainPrivateInfo` | Капитан в round-active / round-answer |
| `blitzCaptainItem` | `BlitzItem` | Капитан в blitz-active / blitz-answer |
| `answerSent` | `boolean` | Игрок уже ответил |
| `blitzAnswerSent` | `boolean` | Игрок уже ответил (блиц) |
| `readySent` | `boolean` | Игрок нажал "Готов" |
| `blitzTaskList` | `BlitzTaskPublic[]` | Блиц-фазы |

### HomePage

Мок не нужен — рендерится сразу. Для разных видов используйте `beforeScreenshot` с кликами по кнопкам.
