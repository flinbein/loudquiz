# Host: Blitz

Экраны ведущего на фазах блиц-раунда
([blitz-captain](../../game/phases.md#blitz-captain) —
[blitz-review](../../game/phases.md#blitz-review)).

## blitz-captain

### Элементы экрана

- **Таймер** — 60 секунд.
- **Таблица заданий** ([TaskView](../components/TaskView.md)).
- **Текст** — команда выбирает капитана и очерёдность.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)) —
  отображает выбранного капитана и слоты очерёдности.

## blitz-pick

### Элементы экрана

- **Таймер** — 60 секунд.
- **Таблица заданий** ([TaskView](../components/TaskView.md)).
- **Текст** — капитан выбирает блиц-задание.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).

## blitz-ready

### Элементы экрана

- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка блиц-задания** ([TaskCard](../components/TaskCard.md)) —
  стоимость задания. Текст **скрыт**.
- **Текст** — команда готовится к раунду.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).

## blitz-active

### Элементы экрана

- **Таймер** — `10с + 20с × responders_count`
  (см. [глоссарий](../../game/glossary.md)).
- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка блиц-задания** ([TaskCard](../components/TaskCard.md)) —
  стоимость задания. Текст **скрыт**.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).

### Оповещения

Звуковой сигнал + вибрация в начале и конце фазы.

## blitz-answer

### Элементы экрана

- **Таймер** — `20с + 5с × responders_count`.
- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка блиц-задания** ([TaskCard](../components/TaskCard.md)) —
  стоимость задания. Текст **скрыт**.
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).
- **Текст** — отвечает игрок {имя}.

## blitz-review

### Элементы экрана

- **Таблица заданий** ([TaskView](../components/TaskView.md), уменьшенный вариант).
- **Карточка блиц-задания** ([TaskCard](../components/TaskCard.md)) —
  стоимость и текст задания (**видимый**).
- **Таблица состава** ([PlayerStatusTable](../components/PlayerStatusTable.md)).
- **Схема раунда** — цепочка игроков с указанием, кто дал ответ
  и сколько бонусного времени осталось.
- **Количество баллов** за раунд.
- **Кнопка «Продолжить»**.

### Схема раунда

```
[Капитан] ➡️ [Игрок 1] ➡️ [Игрок 2] ... ➡️ [Игрок N]
                              ⬇️ (+0:10)
                         [карточка ответа]
```

Визуальное представление цепочки объяснений. Стрелка и карточка ответа
отображаются у игрока, который дал финальный ответ.

## См. также

- [Player: Blitz](../player-screens/blitz.md)
- [Блиц-раунды](../../game/blitz.md)
- [Подсчёт очков](../../game/scoring.md#блиц-раунд)
