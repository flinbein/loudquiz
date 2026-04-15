# AI Comment Bubble — Design

## Контекст

В `src/pages/round/HostRound.Main.tsx` (строка ~106) на фазе `round-result`, когда у `review.comment` есть текст, сейчас рендерится временная заглушка:

```tsx
return <div>
  TODO: AI COMMENT
  {review.comment}
</div>
```

Нужно заменить её на готовый UI-компонент, отображающий комментарий ИИ к раунду на экране ведущего (большой экран).

## Назначение и тон

ИИ выступает в роли **ироничного комментатора шоу**: 2–5 предложений с лёгкой подколкой в адрес команд. Подача должна усиливать это ощущение — «живой комментатор», а не статичный блок текста.

## Архитектура: два компонента

Разделяем на два независимых компонента, чтобы аватарку можно было эволюционировать (emoji → SVG → анимация) без трогания логики пузыря.

### 1. `AiAvatar`

Отдельный компонент аватарки ИИ-ведущего.

**Расположение:** `src/components/AiAvatar/`

**Файлы:**
- `AiAvatar.tsx`
- `AiAvatar.module.css`
- `AiAvatar.stories.tsx`

**Props:** отсутствуют (v1).

**Рендер (v1):** emoji `🤖` в круглой обводке (border + фон). Все внутренние размеры заданы в `em` — компонент масштабируется от `font-size` родительского блока (по примеру `PlayerAvatar`, где размер контейнера управляется снаружи). Родитель (`AiCommentBubble`) задаёт `font-size` для слота аватарки.

Позже тело компонента можно заменить на SVG или анимированную «морду» без изменений в потребителях.

### 2. `AiCommentBubble`

Speech-bubble с typewriter-анимацией.

**Расположение:** `src/components/AiCommentBubble/`

**Файлы:**
- `AiCommentBubble.tsx`
- `AiCommentBubble.module.css`
- `AiCommentBubble.stories.tsx`

**Props:**
```ts
type AiCommentBubbleProps = {
  text: string;
  charDelayMs?: number;  // default: 15
};
```

**Лейаут:** flex-ряд — `<AiAvatar size="lg"/>` слева, справа `<div class="bubble">` с хвостиком-треугольником, указывающим на аватарку.

## Typewriter-анимация — детали реализации

### Проблема reflow
Текст растёт посимвольно → высота/ширина пузыря будет прыгать → визуальный шум. Решение: «призрачный» дубликат полного текста задаёт размеры, видимый слой печатается поверх.

### Техника: CSS Grid stack
Не `position: absolute`, а grid-stack — оба слоя в одной ячейке:

```css
.bubble {
  display: grid;
}
.bubble > * {
  grid-area: 1 / 1;
}
.ghost {
  visibility: hidden;  /* задаёт размер */
}
.visible {
  /* печатается поверх, унаследует тот же поток */
}
```

Преимущества перед `position: absolute`: наследуется поведение потока (wrapping, padding, margins соседей), одна типографика автоматически гарантирует совпадение размеров.

### Imperative-обновление через ref (без ре-рендеров)

Обновление каждые 15мс через `useState` вызывало бы ~66 ре-рендеров/сек. Вместо этого — imperative-подход:

```tsx
const visibleRef = useRef<HTMLSpanElement>(null);
const caretRef = useRef<HTMLSpanElement>(null);

useEffect(() => {
  const visibleEl = visibleRef.current;
  const caretEl = caretRef.current;
  if (!visibleEl || !caretEl) return;

  visibleEl.textContent = "";
  caretEl.classList.add(styles.caretActive);

  let i = 0;
  const id = setInterval(() => {
    i++;
    visibleEl.textContent = text.slice(0, i);
    if (i >= text.length) {
      clearInterval(id);
      caretEl.classList.remove(styles.caretActive);
    }
  }, charDelayMs);

  return () => clearInterval(id);
}, [text, charDelayMs]);
```

React рендерит компонент один раз на смену `text`; typewriter «дописывает» ноду через `textContent` напрямую. Призрачный слой `ghost` рендерится через JSX полным текстом — обновляется нормально при смене `text`, задавая размер.

### Каретка
Отдельный `<span ref={caretRef}>▌</span>` рядом с видимым слоем. CSS `@keyframes` с `opacity 0↔1`, период ~500мс (`steps(2)`). Класс `caretActive` включает видимость/анимацию, снимается по завершении печати.

### Смена текста

При смене `text` effect перезапускается: старый интервал останавливается в cleanup, `visibleEl.textContent` обнуляется, стартует новый цикл печати с нуля. Без fade-анимации — простая мгновенная замена.

Призрачный слой обновляется через JSX на новый текст и сразу задаёт корректный размер пузыря для новой анимации.

## Стилистика

- **Пузырь:** `border-radius: 20px`, хвостик-треугольник слева (через `::before` с `border: transparent`), фон `var(--color-surface)` (или лёгкий акцент), `box-shadow` для плавающего эффекта.
- **Шрифт:** крупный (большой экран), ≈1.5× от обычного текста, `line-height: 1.4`.
- **Подпись `— AI`:** мелкий текст в нижнем-правом углу пузыря, приглушённый цвет.
- **Отступы:** комфортный `padding` для крупной типографики (~20–24px).

## Интеграция в HostRound.Main

`src/pages/round/HostRound.Main.tsx`, функция `AIControl`, ветка `phase === "round-result" && review?.comment`:

**Было:**
```tsx
return <div>
  TODO: AI COMMENT
  {review.comment}
</div>
```

**Станет:**
```tsx
return <AiCommentBubble text={review.comment} />;
```

Возможно потребуется небольшая корректировка в `HostRound.module.css` для размещения пузыря в потоке (отступы/выравнивание), если дефолтное поведение в `HostMainContainer` не даёт нужного результата.

## Тестирование

- **Unit (vitest):** базовый рендер `AiCommentBubble` (текст отображается целиком после завершения анимации), корректная работа при смене `text`.
- **Stories (Ladle):** по одной story-файлу на компонент; для `AiCommentBubble` — примеры с разной длиной текста (1 предложение, 5 предложений), демонстрация смены текста.

## Out of scope

- Звуковой эффект печати (может быть добавлен позже через audio-менеджер).
- Озвучка комментария TTS.
- Дифференциация стиля пузыря по тону (pos/neg/neutral).
- Анимированная аватарка — позже через замену внутренностей `AiAvatar`.
