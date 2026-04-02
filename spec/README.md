# Loud Quiz — Спецификация проекта

Loud Quiz — командная викторина, в которой игроки надевают наушники с музыкой,
а капитан объясняет задание жестами и мимикой. Игроки должны понять вопрос
и дать уникальные ответы, не слыша друг друга.

## Оглавление

### Общее

- [Обзор проекта](01-overview.md) — концепция, роли, режимы игры
- [Технологический стек](02-tech-stack.md) — архитектура, библиотеки, сборка

### Игровая механика

- [Обзор](game/README.md) — общий игровой процесс
- [Глоссарий](game/glossary.md) — единый справочник терминов
- [Правила игры](game/rules.md) — правила составления и оценки вопросов
- [Фазы игры](game/phases.md) — состояния и переходы
- [Подсчёт очков](game/scoring.md) — формулы начисления баллов
- [Блиц-раунды](game/blitz.md) — механика блиц-заданий

### Интерфейс

- [Дизайн-система](ui/README.md) — размеры экранов, темы, общие элементы

#### Экраны ведущего

- [Game Setup](ui/host-screens/game-setup.md)
- [Lobby](ui/host-screens/lobby.md)
- [Topics Suggest](ui/host-screens/topics-suggest.md)
- [Round](ui/host-screens/round.md)
- [Blitz](ui/host-screens/blitz.md)
- [Finale](ui/host-screens/finale.md)

#### Экраны игрока

- [Lobby](ui/player-screens/lobby.md)
- [Topics Suggest](ui/player-screens/topics-suggest.md)
- [Round](ui/player-screens/round.md)
- [Blitz](ui/player-screens/blitz.md)
- [Finale](ui/player-screens/finale.md)

#### UI-компоненты

- [PlayerAvatar](ui/components/PlayerAvatar.md)
- [Envelope](ui/components/Envelope.md)
- [BlitzBox](ui/components/BlitzBox.md)
- [TaskView](ui/components/TaskView.md)
- [PlayerStatusTable](ui/components/PlayerStatusTable.md)
- [Sticker](ui/components/Sticker.md)
- [StickerStack](ui/components/StickerStack.md)
- [TaskCard](ui/components/TaskCard.md)

### Системные модули

- [Транспорт](systems/transport/README.md) — абстракция связи
  - [Broadcast Channel](systems/transport/broadcast-channel.md)
  - [p2pt](systems/transport/p2pt.md)
  - [VarHub](systems/transport/varhub.md)
- [Аудио-система](systems/audio.md)
- [AI-интеграция](systems/ai/README.md)
  - [Генерация тем](systems/ai/topic-generation.md)
  - [Генерация вопросов](systems/ai/question-generation.md)
  - [Проверка ответов](systems/ai/answer-check.md)
  - [Генерация блиц-заданий](systems/ai/blitz-generation.md)
- [Управление состоянием](systems/state.md)
- [Персистентность](systems/persistence.md)
- [Тестирование](systems/testing.md)

### Инструменты

- [Редактор вопросов](tools/constructor.md)
- [Ladle (Storybook)](tools/storybook.md)

---

## Правила оформления документации

### Язык

- Текст документации — **русский язык**.
- Названия компонентов, фаз, интерфейсов и технических терминов — **английский язык**
  (GamePhase, Envelope, TaskCard, round-active и т.д.).

### Формат файлов

- Формат — Markdown (`.md`).
- Максимальный размер файла — **500 строк**.
- Каждый файл начинается с заголовка `# Название`.
- После заголовка — краткое описание (1-3 предложения).
- В конце файла — блок **«См. также»** со ссылками на связанные разделы.

### Ссылки

- Используются **относительные пути**: `[фазы игры](game/phases.md)`.
- Ссылки на конкретные секции: `[подсчёт очков](game/scoring.md#обычный-раунд)`.
- Ссылки на компоненты: `[PlayerAvatar](ui/components/PlayerAvatar.md)`.

### Структуры данных

- Для описания структур данных используется **TypeScript**-синтаксис.
- Интерфейсы оборачиваются в блоки ` ```typescript `.

### Изображения

- Изображения хранятся в директории `spec/images/`, сгруппированные по разделам:
  - `spec/images/ui/` — макеты и скриншоты интерфейса
  - `spec/images/game/` — схемы игровых процессов
  - `spec/images/systems/` — диаграммы систем
- Формат файлов: PNG для скриншотов и макетов, SVG для схем и диаграмм.
- Имя файла — латиницей, через дефис: `lobby-host-screen.png`.
- Вставка в документ: `![Описание](../images/ui/lobby-host-screen.png)`.
- Alt-текст обязателен и должен описывать содержимое изображения.

### Директории

- `README.md` в каждой поддиректории — точка входа с кратким описанием
  и ссылками на файлы внутри.
- Файлы верхнего уровня нумеруются: `01-overview.md`, `02-tech-stack.md`.
- Файлы внутри поддиректорий не нумеруются.
