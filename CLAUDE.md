# Loud Quiz v2

Мультиплеерная party-quiz игра. Host на большом экране, игроки на мобильных.

## Стек

- React 19 + TypeScript (strict) + Vite
- CSS Modules для стилей
- Zustand для состояния
- i18next для локализации (ru, en)
- react-router-dom для роутинга
- Vitest + Testing Library для тестов
- Playwright для E2E
- Ladle для stories

## Структура

```
src/
  pages/         — страницы-маршруты
  components/    — UI-компоненты (каждый в своей папке с .module.css и .stories.tsx)
  store/         — Zustand store, actions, selectors
  types/         — TypeScript типы
  transport/     — абстракция связи (BroadcastChannel / p2pt / VarHub)
  logic/         — чистые функции игровой логики
  audio/         — аудио-менеджер
  ai/            — AI-интеграция (OpenRouter)
  hooks/         — React-хуки
  i18n/          — переводы
  styles/        — глобальные стили и темы
  persistence/   — localStorage / sessionStorage
```

## Конвенции

- Path alias: `@/` → `src/`
- Компоненты: именованные экспорты (`export function ComponentName`)
- Стили: CSS Modules (`ComponentName.module.css`), camelCase для имён классов
- Stories: `ComponentName.stories.tsx` рядом с компонентом
- Тесты: `*.test.ts(x)` рядом с тестируемым файлом
- Язык кода и комментариев: английский
- Язык UI: русский (по умолчанию), все строки через i18next

## Команды

```bash
npm run dev            # Dev-сервер (0.0.0.0)
npm run dev:storybook  # Ladle
npm run build          # Сборка
npm run test           # Vitest
npm run test:e2e       # Playwright
```

## Роутинг

| Маршрут | Страница |
|---|---|
| `/` | Главная |
| `/constructor` | Редактор вопросов |
| `/rules` | Правила |
| `/play?room=<id>` | Игра |

## Темы

Светлая / тёмная / системная. CSS-переменные в `src/styles/theme.css`.
Атрибут `data-theme` на `<html>`.

## Цвета команд

- Команда 1: красный (`--color-team-red`)
- Команда 2: синий (`--color-team-blue`)
- Без команды: бежевый (`--color-team-neutral`)
