# CalibrationPopup — дизайн

**Дата:** 2026-04-11
**Фаза:** Фаза 7 (Аудио + Блиц) — отдельная под-задача
**Скоуп:** попап «Калибровка», включая подстройку часов (clock sync). Аудио-система и блиц — отдельные спеки.

## Цель

Дать каждому устройству (host и player) отдельный попап, в котором:

1. Настраивается громкость музыки, громкость сигнала, вибрация (со всеми тестами).
2. Переключается режим «Общие наушники» (см. §2).
3. Проверяется и при необходимости корректируется синхронизация часов с host (см. §3).

Попап **доступен во всех фазах игры**, включая активные (`round-active`, `blitz-active`), и служит «дистанционкой» для device-specific параметров во время игры.

## §1. Размещение

### Точки входа

- **Toolbar 🔊** в правом верхнем углу, присутствует на всех host/player экранах внутри `PlayPage`. На страницах `/`, `/setup`, `/rules`, `/constructor` попапа нет.
- **Нижняя кнопка «Калибровка»** в `PlayerLobby` — дублирующая, крупная, остаётся для UX лобби. Открывает тот же попап.

### Компонентная иерархия

```
PlayPage
  └── GameShell (новый)
        ├── Toolbar
        ├── CalibrationPopupContainer (читает сторы, собирает props)
        │     └── CalibrationPopup
        │           ├── BottomSheet
        │           ├── MusicRow
        │           ├── SignalRow
        │           ├── VibrationRow
        │           ├── SharedHeadphonesRow
        │           ├── ClockCalibrationSection
        │           └── InstructionsBlock
        └── {children} — HostLobby / PlayerLobby / HostRound / ...
```

### Правило изоляции компонентов

**Компоненты под `src/components/` НЕ читают сторы.** Все данные — через props. Сторы читаются только в `pages/`:

- `GameShell.tsx` — root shell, читает `calibrationUiStore` для `open`.
- `CalibrationPopupContainer.tsx` (в `src/pages/calibration/`) — читает `calibrationSettingsStore`, `calibrationUiStore`, `clockSyncStore`, определяет role (host/player), держит локальный `useState` только для `tempOffset` и `syncing`, вызывает хуки `useTestAudio` / `useClockTick` / `useSecondPulse` и прокидывает результаты как props в `CalibrationPopup`. Состояние раскрытия clock-секции живёт в `calibrationUiStore.clockSectionExpanded`.

Исключение: `useTranslation()` из i18next допустим в компонентах.

## §2. Контент попапа

Формат — **bottom sheet**: поднимается снизу, хэндл сверху, закрытие по свайпу вниз / клику в затемнение / `Escape`.

Порядок строк сверху вниз:

| # | Строка | Контролы |
|---|---|---|
| 1 | 🎵 Музыка | Кнопка ▶/⏸ + VolumeSlider (0..1) |
| 2 | 🔔 Сигнал | Кнопка ♪ (тест) + VolumeSlider (0..1) |
| 3 | 📳 Вибрация | Кнопка 📳 (тест) + ToggleSwitch |
| 4 | *разделитель* | |
| 5 | 🎧 Общие наушники | ToggleSwitch |
| 6 | *разделитель* | |
| 7 | ▾ Подстройка таймера | Раскрывающаяся секция (см. §3) |
| 8 | *инструкция* | Серый блок с текстом |

Текст инструкции (i18n ключ `calibration.instructions`):
> «Настрой громкость так, чтобы не слышать соседей. Сигнал должен пробиваться поверх музыки. Отключи уведомления на время игры.»

### Режим изоляции тестового аудио

Тестовые кнопки (`▶` музыка, `♪` сигнал) играют звук через **отдельные** `HTMLAudioElement`, не связанные с игровым `audioManager` (Фаза 7). Игровая музыка под попапом продолжает идти как была — эти два источника сосуществуют. При закрытии попапа тестовые элементы глушатся.

Слайдеры громкости пишут живьём в `calibrationSettingsStore`. Игровой `audioManager` подписан на тот же стор, поэтому слайдер во время активной фазы **меняет громкость реальной игровой музыки/сигналов в реальном времени** — это ключевая фича.

### Вибрация

- Тест `📳` — однократный `navigator.vibrate(200)`.
- Тоггл — `CalibrationSettings.hapticEnabled`.
- Если `navigator.vibrate === undefined`, обе контроли отрисованы, но `disabled`, с inline-подсказкой `calibration.vibrationUnsupported`. Значение в сторе не трогаем.

### «Общие наушники»

Флаг `CalibrationSettings.sharedHeadphones` (новое поле, default `false`). Семантика реального сценария — игроки передают наушники друг другу, не переподключая их от своих устройств.

**Логика аудио по ролям** (будет реализована в `useAudio` / `audioManager` в Фазе 7; здесь фиксируется для ясности):

| Роль | `sharedHeadphones = false` | `sharedHeadphones = true` |
|---|---|---|
| Player своей команды | музыка + сигналы когда его команда активна; вибрация всегда | музыка + сигналы во время игры **любой** команды; вибрация всегда |
| Player чужой команды | только вибрация (когда не его команда) | музыка + сигналы во время игры любой команды; вибрация всегда |
| Host | сигналы + вибрация; музыку не слышит | сигналы + вибрация + **музыка** для любой команды |
| Spectator | как host | как host |

Правило одинаково применяется к round и blitz фазам (см. `spec/game/blitz.md` — блиц наследует концепт «активная команда»).

В `single-team mode` команда одна и всегда активная, так что для player флаг не меняет поведения. На host и spectator — меняет.

## §3. Секция «Подстройка таймера»

Раскрывающаяся секция в конце попапа. По умолчанию **свёрнута**. Состояние раскрытия живёт в `calibrationUiStore.clockSectionExpanded`, сбрасывается при закрытии попапа.

### Интеграция с существующим `clockSyncStore`

`clockSyncStore` уже реализован (`src/store/clockSyncStore.ts`): хранит `offset` (player-local), обновляется автоматически при connect через `runSyncHandshake` (`src/transport/clockSync.ts`, Cristian's algorithm × 5 сэмплов). На host `offset === 0` всегда.

Эта секция — UI поверх того, что уже есть. Новых полей в `clockSyncStore` не добавляем.

### UI раскрытого состояния

```
┌──────────────────────────────────────────────┐
│                                              │
│              12:47          (🗘)             │
│           (пульс фона, тик-звук)             │
│                                              │
│   offset: -187 ms                            │
│                                              │
│   -200 ─────────────●───── +200              │
│                                              │
│   +120 ms              [ Применить ]         │
│                                              │
└──────────────────────────────────────────────┘
```

**Режим player:**

- **`ClockDisplay`** показывает `MM:SS` от `getHostNow() + tempOffset`. Фон вспышкой мигает 80ms на каждой границе целой секунды (через `useSecondPulse`).
- **`ClockTick`** играет короткий щелчок (~8ms, синус 2kHz с быстрым envelope, генерируется программно через WebAudio) на каждой границе секунды `hostTime`. Громкость = `signalVolume`. Тик включается автоматически при раскрытии секции, глушится при сворачивании / закрытии попапа.
- **`OffsetSlider`** — диапазон `[-200, +200]` ms, шаг 1, центр 0, snap к 0 в пределах ±3ms. Пишет в локальный `useState` `tempOffset` контейнера.
- **`OffsetControls`**:
  - `offset: <значение> ms` — текущий `clockSyncStore.offset` (только отображение).
  - `<знак><значение> ms` — текущий `tempOffset`, скрыт когда 0.
  - `[Применить]` — `disabled` когда `tempOffset === 0`. При клике: `setOffset(offset + tempOffset)`, `tempOffset = 0`.
  - `(🗘)` — re-sync. Блокирует слайдер и кнопки (aria-busy, CSS opacity), вызывает `runSyncHandshake`. При успехе: `setOffset(newOffset)`, `tempOffset = 0`. При ошибке: показывает `calibration.clockResyncFailed` inline на 3 секунды, ничего не меняет.

**Режим host:**

На host секция read-only: отображается **только** `ClockDisplay` + тик. Никакого слайдера, `OffsetControls`, re-sync. Смысл: host — это референс, ему самому корректировать нечего. Тик играет через динамики big-screen устройства — именно то, что нужно player'ам для сравнения ухом рядом с host.

### Тик: источник, планирование

- **Генерация:** короткий BufferSource программно в WebAudio (не файл). Длина 8ms, частота 2kHz, экспоненциальный envelope для мягкого атака/релиза.
- **Планирование:** `useClockTick` получает пропсами `{ enabled, offset, tempOffset, volume }`, вычисляет `nextHostSecondBoundary` в локальном времени (`hostSecondMs - offset - tempOffset`) и планирует BufferSource через `audioCtx.currentTime`. После каждого тика — пересчёт следующего.
- **Host vs player:** на host `offset === 0` и `tempOffset === 0` (UI для них отсутствует), но хук работает одинаково — просто получает нули.
- **user gesture:** `AudioContext` создаётся лениво, внутри обработчика «раскрыть секцию» — это валидный user gesture (важно для iOS).

## §4. Поведение

### Открытие / закрытие

- Триггер: `setCalibrationUiOpen(true)` из Toolbar 🔊 или нижней кнопки `PlayerLobby`.
- Закрытие: клик в затемнение, свайп вниз по хэндлу, `Escape`, клик по кнопке закрытия (если есть). Все пути дергают `setCalibrationUiOpen(false)`.
- При закрытии (`setOpen(false)`):
  - Тестовая музыка и сигнал глушатся (хук `useTestAudio` снимает `audio.src` / `audio.pause()`).
  - Секция «Подстройка таймера» сворачивается: `calibrationUiStore.setOpen` внутри себя обнуляет `clockSectionExpanded = false`.
  - `tempOffset` в контейнере сбрасывается в 0 через `useEffect` на изменение `open`.
  - Фокус возвращается на элемент-триггер.

### Доступность

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` указывает на заголовок «Калибровка».
- Focus trap внутри `BottomSheet`. При открытии — фокус на заголовок. При закрытии — возврат на триггер.
- Все контролы с `aria-label` / видимым label.
- Слайдеры реагируют на стрелки клавиатуры (1ms на стрелку, 10ms с shift).
- ToggleSwitch — Enter/Space.

### Взаимодействие с игрой

- Попап перекрывает игру, но **не ставит её на паузу**. Таймер фазы продолжает идти, фоновая музыка играет, сигналы приходят.
- Слайдеры громкости меняют реальные уровни игрового аудио в реальном времени.
- Всё, что касается игры (state, transport), попап не трогает.

### Граничные случаи

1. **Вкладка в фоне → `AudioContext` suspended.** При повторном раскрытии секции — `audioCtx.resume()`.
2. **Re-sync падает.** `runSyncHandshake` кидает ошибку → inline-сообщение 3 секунды, ничего в сторы не пишем, `tempOffset` не трогаем.
3. **Fullscreen включён.** `BottomSheet` с `position: fixed` рендерится нормально в `:fullscreen` контексте.
4. **Открытие попапа на host screen (big screen).** Лейаут bottom sheet хорошо смотрится и там, max-width на карточке.
5. **Рассинхрон > 200ms после handshake.** Не вмещается в один проход слайдера — пользователь применяет 200ms, слайдер сбрасывается, продолжает. Две итерации = 400ms. Достаточно.
6. **Swipe-to-close конфликтует с внутренним скроллом.** Контент попапа не должен переполнять высоту. На текущем объёме (~8 строк) скролла нет — ограничение фиксируем.

## §5. Данные и сторы

### `CalibrationSettings` (расширение)

`src/persistence/localPersistence.ts`:

```ts
export interface CalibrationSettings {
  musicVolume: number;       // 0..1, default 0.7
  signalVolume: number;      // 0..1, default 0.8
  hapticEnabled: boolean;    // default true
  sharedHeadphones: boolean; // NEW, default false
}
```

Миграция: при чтении старой записи без `sharedHeadphones` — мёрж с `defaultCalibration`. Функциональной миграции не требуется.

### `calibrationSettingsStore` (новый)

`src/store/calibrationSettingsStore.ts` — тонкий Zustand-стор, реактивное отражение `CalibrationSettings`:

```ts
interface CalibrationSettingsState extends CalibrationSettings {
  setMusicVolume: (v: number) => void;
  setSignalVolume: (v: number) => void;
  setHapticEnabled: (enabled: boolean) => void;
  setSharedHeadphones: (enabled: boolean) => void;
}
```

При инициализации читает из `localPersistence.getCalibration()`. Каждый setter write-through: обновляет стор И вызывает `setCalibration(...)` в localStorage. Это единственный источник правды в рантайме — `useAudio` и попап подписываются сюда.

### `calibrationUiStore` (новый)

`src/store/calibrationUiStore.ts`:

```ts
interface CalibrationUiState {
  open: boolean;
  clockSectionExpanded: boolean;
  setOpen: (open: boolean) => void;
  toggleClockSection: () => void;
}
```

Не персистится. При старте всегда `open: false, clockSectionExpanded: false`. Причина существования — дублирующая кнопка в `PlayerLobby` должна открывать тот же попап, что и Toolbar, без prop drilling.

### `clockSyncStore` (существующий, не меняется)

Использование только через публичный API: `useClockSyncStore()`, `getHostNow()`, `setOffset()`. `tempOffset` — локальный `useState` внутри `CalibrationPopupContainer`, **не** уходит в стор.

## §6. Компоненты

Все компоненты ниже — props-only, без импорта сторов. Каждый с `.module.css` и `.stories.tsx`.

### Переиспользуемые примитивы

| Компонент | Props | Назначение |
|---|---|---|
| `Toolbar` | `{ onOpenCalibration, onToggleFullscreen, onToggleTheme, theme }` | Три кнопки в углу экрана. Извлекается из `PlayerLobby`. |
| `BottomSheet` | `{ open, onClose, children, ariaLabel }` | Обёртка: backdrop, handle, swipe-to-close, Escape, focus trap, role=dialog. |
| `VolumeSlider` | `{ value, onChange, disabled?, label? }` | Слайдер 0..1, keyboard arrows. |
| `ToggleSwitch` | `{ checked, onChange, disabled?, label? }` | Тоггл ВКЛ/ВЫКЛ, Enter/Space. |

### Специфичные для попапа

| Компонент | Props | Назначение |
|---|---|---|
| `CalibrationPopup` | `{ open, onClose, role, music, signal, vibration, sharedHeadphones, clock, instructions? }` где каждый блок — свой набор `{value, onChange, ...}` | Композиция `BottomSheet` + строк. Без логики, просто раскидывает под-объекты в соответствующие rows. |
| `CalibrationRow` | `{ icon, label, children }` | Layout-примитив: иконка + лейбл + слот контролов. |
| `MusicRow` | `{ volume, onVolumeChange, isPlaying, onTogglePlay }` | Строка «Музыка». |
| `SignalRow` | `{ volume, onVolumeChange, onTest }` | Строка «Сигнал». |
| `VibrationRow` | `{ enabled, onEnabledChange, onTest, supported }` | Строка «Вибрация». |
| `SharedHeadphonesRow` | `{ enabled, onEnabledChange }` | Строка «Общие наушники». |
| `InstructionsBlock` | *none* | Статический текст (через `useTranslation`). |

### Секция clock calibration

| Компонент | Props | Назначение |
|---|---|---|
| `ClockCalibrationSection` | `{ role, expanded, onToggleExpanded, offset, tempOffset, onTempOffsetChange, onApply, onResync, syncing, syncFailed, displayTimeMs, pulsing, tickEnabled }` | Композиция секции. |
| `ClockDisplay` | `{ timeMs, pulsing }` | Крупный `MM:SS` + CSS-пульс фона. |
| `ClockTick` | `{ enabled, nextTickAt, volume }` | Невидимый компонент, планирует щелчок. Внутри использует `useClockTick`. |
| `OffsetSlider` | `{ value, onChange, disabled }` | Слайдер ±200ms. |
| `OffsetControls` | `{ offset, tempOffset, onApply, onResync, syncing, disabled }` | Числа + кнопки. |

### Контейнер

`src/pages/calibration/CalibrationPopupContainer.tsx`:

- Читает `calibrationSettingsStore`, `calibrationUiStore`, `clockSyncStore`, ролевой контекст.
- Держит `tempOffset` в локальном `useState` (сбрасывается в 0 при `open=false`).
- Держит `syncing: boolean` и `syncFailed: boolean` в локальном state.
- Вызывает хуки `useTestAudio`, `useClockTick`, `useSecondPulse`.
- Создаёт и подаёт callbacks (`onVolumeChange`, `onTogglePlay`, `onTest`, `onApply`, `onResync`).
- Рендерит `<CalibrationPopup {...props} />`.

## §7. Хуки

Все — в `src/hooks/`, без импорта сторов (работают на значениях из параметров).

### `useTestAudio(src, volume, enabled)`

Держит `HTMLAudioElement` в `ref`. При `enabled=true` запускает воспроизведение (loop для музыки). При `enabled=false` / unmount — `pause()` и сброс. Громкость — живая, через `audio.volume = volume`.

Варианты использования: отдельный инстанс для музыки (`loop: true`), отдельный для сигнала (`loop: false`).

### `useClockTick({ enabled, offset, tempOffset, volume })`

- Создаёт lazy `AudioContext` (один на компонент).
- При `enabled=true` планирует BufferSource на `nextHostSecondBoundary - offset - tempOffset` через `audioCtx.currentTime`. После каждого тика — пересчёт следующего.
- При `enabled=false` / unmount — отменяет будущие источники, закрывает контекст.
- BufferSource: 8ms синус 2kHz с экспоненциальным envelope, громкость `volume`.

### `useSecondPulse({ enabled, offset, tempOffset })`

Возвращает `{ timeMs, pulsing }`:

- `timeMs` — `getHostNow() + tempOffset`, обновляется через `requestAnimationFrame`.
- `pulsing` — `true` в течение 80ms после пересечения границы целой секунды (для CSS-анимации `opacity` / `background-color`).
- Под капотом rAF-цикл, отписывается при `enabled=false`.

## §8. i18n

Новый неймспейс `calibration.*` в `src/i18n/ru.json` и `en.json`:

```json
"calibration": {
  "title": "Калибровка",
  "music": "Музыка",
  "signal": "Сигнал",
  "vibration": "Вибрация",
  "sharedHeadphones": "Общие наушники",
  "clockSection": "Подстройка таймера",
  "clockOffset": "offset: {{value}} ms",
  "clockPending": "{{sign}}{{value}} ms",
  "clockApply": "Применить",
  "clockResync": "Пересинхронизировать",
  "clockResyncFailed": "Не удалось синхронизировать",
  "instructions": "Настрой громкость так, чтобы не слышать соседей. Сигнал должен пробиваться поверх музыки. Отключи уведомления на время игры.",
  "vibrationUnsupported": "Вибрация не поддерживается устройством",
  "testSignal": "Проиграть сигнал",
  "testVibration": "Проверить вибрацию",
  "playMusic": "Проиграть музыку",
  "pauseMusic": "Остановить музыку",
  "close": "Закрыть"
}
```

Существующий `lobby.calibration` либо ссылается на `calibration.title` (alias), либо удаляется после рефакторинга `PlayerLobby`.

## §9. Тестирование

### Unit / component

- `BottomSheet`: ESC / backdrop / swipe закрывают, focus trap, возврат фокуса на триггер.
- `VolumeSlider`: `onChange` на вводе, стрелки меняют значение, `disabled` блокирует.
- `ToggleSwitch`: click / Enter / Space переключают, `disabled`.
- `CalibrationPopup`: рендер с фиктивными props (open/closed, role host/player, settings).
- `ClockCalibrationSection`: slider → `onTempOffsetChange`, Apply вызывает `onApply` только при `tempOffset !== 0`, re-sync вызывает `onResync`, во время `syncing` контролы disabled.
- `ClockDisplay`: форматирует `timeMs` в `MM:SS`, `pulsing` пропс отражается в className.
- `calibrationSettingsStore`: default values, write-through в localStorage.
- `calibrationUiStore`: open/close, toggle clock section, сброс `clockSectionExpanded` при `setOpen(false)`.
- `useTestAudio`: mock `HTMLAudioElement`, play/pause/volume, cleanup глушит.
- `useClockTick`: mock `AudioContext`, проверка что BufferSource создаётся на `nextHostSecondBoundary - offset - tempOffset`.
- `useSecondPulse`: mock `performance.now`, `pulsing` переключается на границе целой секунды с учётом `tempOffset`.
- `CalibrationPopupContainer`: интеграция — клик по Toolbar открывает, apply вызывает `clockSyncStore.setOffset`, re-sync вызывает `runSyncHandshake`.

### Stories (Ladle)

- Каждый примитив (`BottomSheet`, `VolumeSlider`, `ToggleSwitch`, `Toolbar`) — состояния default / disabled / focus / open.
- `CalibrationPopup` — closed / open / open+clock-expanded / role=host / role=player / vibration unsupported / syncing / sync failed.
- `ClockDisplay` — static / pulsing (через decorator).
- Все `*Row` компоненты — отдельные stories для изоляции.

### Не тестируем

- Реальное воспроизведение `music.mp3` / `ring.mp3` (jsdom).
- Реальный WebAudio timing (мок).
- Реальный `navigator.vibrate` (мок).
- E2E — попап не влияет на игровой флоу, покрытие stories + unit достаточно.

## §10. План файлов

### Новые (40 файлов)

```
src/components/Toolbar/Toolbar.{tsx,module.css,stories.tsx}
src/components/BottomSheet/BottomSheet.{tsx,module.css,stories.tsx,test.tsx}
src/components/VolumeSlider/VolumeSlider.{tsx,module.css,stories.tsx,test.tsx}
src/components/ToggleSwitch/ToggleSwitch.{tsx,module.css,stories.tsx,test.tsx}
src/components/CalibrationPopup/CalibrationPopup.{tsx,module.css,stories.tsx,test.tsx}
src/components/CalibrationPopup/rows/CalibrationRow.{tsx,module.css}
src/components/CalibrationPopup/rows/MusicRow.tsx
src/components/CalibrationPopup/rows/SignalRow.tsx
src/components/CalibrationPopup/rows/VibrationRow.tsx
src/components/CalibrationPopup/rows/SharedHeadphonesRow.tsx
src/components/CalibrationPopup/rows/InstructionsBlock.tsx
src/components/CalibrationPopup/ClockCalibration/ClockCalibrationSection.{tsx,module.css,test.tsx}
src/components/CalibrationPopup/ClockCalibration/ClockDisplay.{tsx,module.css,test.tsx}
src/components/CalibrationPopup/ClockCalibration/ClockTick.tsx
src/components/CalibrationPopup/ClockCalibration/OffsetSlider.tsx
src/components/CalibrationPopup/ClockCalibration/OffsetControls.tsx

src/pages/GameShell.{tsx,module.css}
src/pages/calibration/CalibrationPopupContainer.{tsx,test.tsx}

src/store/calibrationSettingsStore.{ts,test.ts}
src/store/calibrationUiStore.{ts,test.ts}

src/hooks/useTestAudio.{ts,test.ts}
src/hooks/useClockTick.{ts,test.ts}
src/hooks/useSecondPulse.{ts,test.ts}

public/assets/music.mp3   (placeholder 1s silence, если нет)
public/assets/ring.mp3    (placeholder 1s silence, если нет)
```

### Изменённые (5 файлов)

```
src/persistence/localPersistence.ts      — +sharedHeadphones в CalibrationSettings
src/persistence/persistence.test.ts      — обновить тесты на новое поле
src/pages/PlayPage.tsx                   — оборачивает host/player views в <GameShell>
src/pages/lobby/PlayerLobby.tsx          — удалить inline toolbar, добавить вызов calibrationUiStore.setOpen из нижней кнопки
src/pages/lobby/PlayerLobby.module.css   — удалить .toolbar стили
src/i18n/ru.json, src/i18n/en.json       — +calibration.*
```

## §11. Риски и ограничения

- **Audio latency устройства.** Даже после идеального handshake щелчок на player может прозвучать со смещением 5–50ms (аудио-выходы устройства). Это **ровно тот случай**, для которого существует ручной slider + `tempOffset`. Фича знает про этот лимит и предоставляет лечение.
- **`AudioContext` user gesture на iOS.** Решение: создание контекста лениво, внутри клика «раскрыть clock calibration».
- **WebAudio в jsdom.** Тесты мокают `AudioContext` полностью; реальный timing проверяется только вручную.
- **Swipe-to-close vs scroll.** Контент попапа фиксирован по высоте (~8 строк), скролла не предусмотрено. При будущем росте — пересмотреть реализацию `BottomSheet`.
- **Host: `offset === 0` всегда.** `useClockTick` и `useSecondPulse` получают нули из `clockSyncStore`, работают корректно; UI на host обрезан до `ClockDisplay` + тик.

## §12. Зависимости и порядок работ

- **Блокирует:** ничего (компоненты стоят отдельно).
- **Блокируется:** placeholder-файлы `public/assets/music.mp3`, `ring.mp3` должны существовать (пустая тишина ок).
- **Связан с Фазой 7 (аудио-система):** этот попап определяет схему `CalibrationSettings` и `calibrationSettingsStore`, на которые подпишется `useAudio`. Интеграционная работа «музыка реагирует на слайдер во время игры» — часть Фазы 7, не этой спеки.

## §13. Что НЕ входит в скоуп

- Сам `audioManager` / `useAudio` игровой аудио-системы (Фаза 7, отдельная спека).
- Логика включения/выключения музыки по фазам и командам (Фаза 7).
- Реализация блица (Фаза 7).
- `ThemeToggle` / `FullscreenButton` компоненты (отложены в Фазе 10). Toolbar делает их inline через `document` API, как в текущем `PlayerLobby`.
- Перестройка `clockSyncStore` — используется as-is.
