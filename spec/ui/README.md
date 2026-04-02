# Дизайн-система

Общие принципы визуального оформления Loud Quiz.

## Размеры экранов

| Роль | Минимальное разрешение | Устройство |
|---|---|---|
| Host (ведущий) | 1366×768 px | Ноутбук, монитор, телевизор |
| Player (игрок) | 375×600 px | Мобильный телефон |

## Принципы

- **Использовать всё пространство экрана** — элементы занимают максимум доступного места.
- **CSS Modules** — стилизация компонентов через модульные CSS-файлы.
- **Адаптивность** — интерфейс корректно отображается на устройствах от минимального
  разрешения и выше.

## Темы оформления

Приложение поддерживает три режима темы:

- **Светлая** (light)
- **Тёмная** (dark)
- **Системная** (system) — следует настройкам ОС

Переключатель темы доступен на всех экранах.

## Глобальные элементы управления

На всех экранах (host и player) в углу экрана доступны кнопки:

- **Переключение темы** (светлая / тёмная / системная)
- **Полноэкранный режим**
- **Калибровка** — открывает попап настройки аудио

## Цвета команд

| Команда | Цвет |
|---|---|
| Команда 1 | Красный |
| Команда 2 | Синий |
| Без команды (1 команда) | Бежевый |

Цвет команды используется в аватарах, стикерах, карточках и таблицах.

## Содержание раздела

### Экраны ведущего

- [Game Setup](host-screens/game-setup.md)
- [Lobby](host-screens/lobby.md)
- [Topics Suggest](host-screens/topics-suggest.md)
- [Round](host-screens/round.md)
- [Blitz](host-screens/blitz.md)
- [Finale](host-screens/finale.md)

### Экраны игрока

- [Lobby](player-screens/lobby.md)
- [Topics Suggest](player-screens/topics-suggest.md)
- [Round](player-screens/round.md)
- [Blitz](player-screens/blitz.md)
- [Finale](player-screens/finale.md)

### UI-компоненты

- [PlayerAvatar](components/PlayerAvatar.md)
- [Envelope](components/Envelope.md)
- [BlitzBox](components/BlitzBox.md)
- [TaskView](components/TaskView.md)
- [PlayerStatusTable](components/PlayerStatusTable.md)
- [Sticker](components/Sticker.md)
- [StickerStack](components/StickerStack.md)
- [TaskCard](components/TaskCard.md)

## См. также

- [Обзор проекта](../01-overview.md)
- [Аватары](avatars.md)
