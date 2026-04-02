# TaskCard

Карточка с заданием на раунд. Стилизована под глянцевую карту
с закруглёнными краями.

## Структура

```
+-------------------------------+
|             Тема              |
+-------------------------------+
| аватар |    текст задания     |
| имя    |                      |
+-------------------------------+
|                     стоимость |
+-------------------------------+
```

## Параметры

```typescript
interface TaskCardProps {
  topic?: string;
  player?: PlayerData;
  difficulty: number;
  questionText: string;
  hidden: boolean;
}
```

| Параметр | Описание |
|---|---|
| `topic` | Тема вопроса. Для блиц-заданий — текст «Блиц» |
| `player` | Капитан. Аватар без имени и статуса. Имя — полностью, цветом команды |
| `difficulty` | Стоимость задания (100–200 для раундов, 200–400 для блица) |
| `questionText` | Текст задания |
| `hidden` | Скрыть ли текст задания |

## Скрытый текст

Когда `hidden: true`:

- Текст задания становится **прозрачным** (нельзя выделить или прочитать).
- Поверх текста отображается заглушка: **«\* \* \* \* \*»**.

## Профиль капитана

В левой части карточки:

- [PlayerAvatar](PlayerAvatar.md) — без имени и без статуса (online/offline).
- Имя капитана — полностью, цветом команды.

Если `player` не указан — блок пустой.

## Использование

- [Host: Round](../host-screens/round.md) — round-ready, round-active,
  round-answer, round-review
- [Host: Blitz](../host-screens/blitz.md) — blitz-ready, blitz-active,
  blitz-answer, blitz-review
- [Player: Round](../player-screens/round.md) — все фазы
- [Player: Blitz](../player-screens/blitz.md) — все фазы

## См. также

- [PlayerAvatar](PlayerAvatar.md)
- [Envelope](Envelope.md) — карточка вопроса в таблице заданий
