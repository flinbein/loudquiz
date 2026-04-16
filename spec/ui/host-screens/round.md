# Host: Round

Экраны ведущего на фазах обычного раунда
([round-captain](../../game/phases.md#round-captain) —
[round-review](../../game/phases.md#round-review)).

## round-captain

### Элементы экрана

- **Таймер** — 60 секунд.
- **Таблица заданий** ([TaskView](../components/TaskView.md)).
- **Текст** — указание, какая команда выбирает капитана.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)) —
  игроки активной команды с их статусами.

## round-pick

### Элементы экрана

- **Таймер** — 60 секунд.
- **Таблица заданий** ([TaskView](../components/TaskView.md)).
- **Текст** — капитан выбирает вопрос.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).

## round-ready

### Элементы экрана

- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка задания** ([TaskCard](../components/TaskCard.md)) —
  тема и стоимость. Текст задания **скрыт**.
- **Текст** — команда готовится к раунду.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).

## round-active

### Элементы экрана

- **Таймер** — `55с + 5с × team_size` (капитан тоже отвечает)
  (см. [глоссарий](../../game/glossary.md)).
- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка задания** ([TaskCard](../components/TaskCard.md)) —
  тема и стоимость. Текст задания **скрыт**.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).
- **Карточки ответов** ([Sticker](../components/Sticker.md)) —
  по одной на каждого игрока. Текст ответа **скрыт**.

### Оповещения

Звуковой сигнал + вибрация в начале и конце фазы.

## round-answer

### Элементы экрана

- **Таймер** — 20 секунд.
- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка задания** ([TaskCard](../components/TaskCard.md)) —
  тема и стоимость. Текст задания **скрыт**.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).
- **Карточки ответов** ([Sticker](../components/Sticker.md)) —
  текст ответа **скрыт**.

## round-review

### Фаза 1 — Ручной режим

- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка задания** ([TaskCard](../components/TaskCard.md)) —
  тема, стоимость, текст задания (**видимый**).
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).
- **Карточки ответов** ([Sticker](../components/Sticker.md) /
  [StickerStack](../components/StickerStack.md)) — текст ответов **видимый**.
- Для каждой карточки/стопки ведущий отмечает «верно» / «не верно».
- Ведущий может **объединять** карточки в стопки.
- **Бонусное время** — отображается, если игроки завершили round-active досрочно.
- **Кнопка «Продолжить»** — переход к фазе 2.

### Фаза 1 — AI-режим

Аналогично ручному режиму, но вместо ручной оценки:

- **Лоадер** с сообщением «AI оценивает ответы».
- После оценки — автоматический переход к фазе 2.

### Фаза 2 — Результаты

- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка задания** ([TaskCard](../components/TaskCard.md)) — полная информация.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).
- **Карточки/стопки ответов** с оценками.
- **(AI-режим)** Текст с итогом раунда от AI.
- **Количество баллов** за раунд. Состояние джокера, если использован.
- **Кнопка «Оспорить»** — возврат к фазе 1 в ручном режиме.
- **Кнопка «Продолжить»** — переход к следующему раунду.

## Single mode

В режиме одной команды (single mode) нет противников.
На фазах round-active и round-answer текст вопроса на главном экране
остаётся **скрытым** (виден только капитану на его устройстве).

## См. также

- [Player: Round](../player-screens/round.md)
- [Фазы игры](../../game/phases.md)
- [Подсчёт очков](../../game/scoring.md#обычный-раунд)
- [Проверка ответов AI](../../systems/ai/answer-check.md)
