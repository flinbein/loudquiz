# Транспортный слой

Абстракция для связи между host и player. Позволяет переключаться
между реализациями без изменения игровой логики.

## Роли

- **Host** — создаёт комнату, управляет игрой, рассылает состояние.
- **Player** — подключается к комнате по URL/QR-коду, отправляет действия.

## Абстрактный интерфейс

```typescript
interface Transport {
  // Создание комнаты (host)
  createRoom(): Promise<RoomInfo>;

  // Подключение к комнате (player)
  joinRoom(roomId: string): Promise<void>;

  // Отправка сообщения
  send(peerId: string, message: Message): void;

  // Широковещательная отправка (host → все player)
  broadcast(message: Message): void;

  // Подписка на входящие сообщения
  onMessage(handler: (peerId: string, message: Message) => void): void;

  // Подписка на подключение/отключение участников
  onPeerConnect(handler: (peerId: string) => void): void;
  onPeerDisconnect(handler: (peerId: string) => void): void;

  // Закрытие соединения
  close(): void;
}

interface RoomInfo {
  roomId: string;
  joinUrl: string;
}
```

## Выбор реализации

Реализация выбирается в настройках приложения. URL игры содержит
параметр, указывающий на способ связи.

## Переподключение

При потере соединения:

1. Статус игрока меняется на «offline».
2. Транспорт пытается восстановить соединение.
3. При успешном переподключении — статус возвращается в «online».
4. Игровое состояние синхронизируется с host.

## Реализации

- [Broadcast Channel](broadcast-channel.md) — локальная отладка
- [p2pt](p2pt.md) — WebRTC без сервера
- [VarHub](varhub.md) — WebSocket rooms

## См. также

- [Технологический стек](../../02-tech-stack.md)
- [Управление состоянием](../state.md)
