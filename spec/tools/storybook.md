# Ladle (Storybook)

[Ladle](https://ladle.dev/) — легковесная альтернатива Storybook,
нативная для Vite. Используется для разработки и визуального
тестирования UI-компонентов.

## Запуск

```bash
npm run dev:storybook
```

## Структура stories

Stories располагаются рядом с компонентами:

```
src/components/
├── PlayerAvatar/
│   ├── PlayerAvatar.tsx
│   ├── PlayerAvatar.module.css
│   └── PlayerAvatar.stories.tsx
├── Envelope/
│   ├── Envelope.tsx
│   ├── Envelope.module.css
│   └── Envelope.stories.tsx
└── ...
```

## Формат stories

```typescript
// PlayerAvatar.stories.tsx
import { PlayerAvatar } from "./PlayerAvatar";

export const Default = () => (
  <PlayerAvatar
    size="medium"
    playerName="Алексей"
    team="red"
    emoji="🎅🏻"
    online={true}
  />
);

export const Offline = () => (
  <PlayerAvatar
    size="medium"
    playerName="Алексей"
    team="red"
    emoji="🎅🏻"
    online={false}
  />
);

export const AllSizes = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "end" }}>
    <PlayerAvatar size="small" emoji="🤖" team="blue" online />
    <PlayerAvatar size="medium" emoji="🤖" team="blue" online playerName="Бот" />
    <PlayerAvatar size="large" emoji="🤖" team="blue" online playerName="Бот" />
  </div>
);
```

## Компоненты для покрытия

Каждый компонент из раздела [UI-компоненты](../ui/README.md#ui-компоненты)
должен иметь stories с основными визуальными состояниями:

- [PlayerAvatar](../ui/components/PlayerAvatar.md) — размеры, команды, online/offline
- [Envelope](../ui/components/Envelope.md) — открыт/закрыт, активный, с джокером
- [BlitzBox](../ui/components/BlitzBox.md) — активный, с текстом, цвета команд
- [TaskView](../ui/components/TaskView.md) — полный/компактный размер
- [PlayerStatusTable](../ui/components/PlayerStatusTable.md) — роли, статусы
- [Sticker](../ui/components/Sticker.md) — верный/неверный ответ, печати
- [StickerStack](../ui/components/StickerStack.md) — один/несколько стикеров
- [TaskCard](../ui/components/TaskCard.md) — скрытый/видимый текст, блиц

## См. также

- [Технологический стек](../02-tech-stack.md)
- [UI-компоненты](../ui/README.md#ui-компоненты)
- [Тестирование](../systems/testing.md)
