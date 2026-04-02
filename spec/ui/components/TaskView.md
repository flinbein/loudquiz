# TaskView

Таблица с заданиями. Отображает все вопросы и блиц-раунды игры.

## Структура

### Таблица вопросов

Колонки — темы. Строки — вопросы внутри темы.
Каждая ячейка — компонент [Envelope](Envelope.md).

```
| Тема 1       | Тема 2       | Тема 3       |
|--------------|--------------|--------------|
| <Envelope>   | <Envelope>   | <Envelope>   |
| <Envelope>   | <Envelope>   | <Envelope>   |
| <Envelope>   | <Envelope>   | <Envelope>   |
```

### Список блиц-раундов

Под таблицей вопросов горизонтально выводятся блиц-раунды.
Каждый элемент — компонент [BlitzBox](BlitzBox.md).

```
<BlitzBox>  <BlitzBox>  <BlitzBox>  <BlitzBox>
```

## Параметры

```typescript
interface TaskViewProps {
  size: "small" | "large";
  gameState: GameHistoryState;
  onSelectQuestion?: (theme: string, index: number) => void;
}
```

| Параметр | Описание |
|---|---|
| `size` | Размер: `large` — полная таблица, `small` — компактный вариант |
| `gameState` | Состояние игры для определения статуса каждого задания |
| `onSelectQuestion` | Callback при выборе вопроса (для капитана) |

## Информация из gameState

Компонент определяет для каждого задания:

- Список вопросов и количество блиц-раундов
- Текущий активный вопрос или блиц-раунд
- Какие задания сыграны и какой счёт принесли
- Был ли использован джокер на конкретном вопросе

## Использование

Отображается практически на всех фазах игры:
- [Host: Round](../host-screens/round.md)
- [Host: Blitz](../host-screens/blitz.md)
- [Host: Finale](../host-screens/finale.md)
- [Player: Round](../player-screens/round.md) (round-pick)
- [Player: Topics Suggest](../player-screens/topics-suggest.md) (фаза 2)

## См. также

- [Envelope](Envelope.md)
- [BlitzBox](BlitzBox.md)
