import { type BlitzTask, type BlitzItem } from "../../game/types";
import { validateBlitzItem, emptyBlitzItem } from "./constructorUtils";

interface Props {
  task: BlitzTask;
  index: number;
  onChange: (t: BlitzTask) => void;
  onDelete: () => void;
}

const DIFFICULTIES = Array.from({ length: 21 }, (_, i) => 200 + i * 10);

const inputCls =
  "bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent";
const borderNormal = "border-slate-300 dark:border-slate-600";
const borderError = "border-red-400 dark:border-red-500";

export default function BlitzTaskEditor({ task, index, onChange, onDelete }: Props) {
  function updateItem(i: number, patch: Partial<BlitzItem>) {
    const items = task.items.map((item, idx) => (idx === i ? { ...item, ...patch } : item));
    onChange({ ...task, items });
  }

  function addItem() {
    onChange({ ...task, items: [...task.items, emptyBlitzItem()] });
  }

  function removeItem(i: number) {
    onChange({ ...task, items: task.items.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Задание {index + 1}</span>
        <button
          onClick={onDelete}
          className="text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 text-sm px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
        >
          Удалить
        </button>
      </div>

      <div className="space-y-2">
        {task.items.map((item, i) => {
          const errors = validateBlitzItem(item);
          const hasError = (field: string) => errors.some((e) => e.field === field);
          return (
            <div key={i} className="flex gap-2 items-start">
              <input
                type="text"
                value={item.text}
                onChange={(e) => updateItem(i, { text: e.target.value })}
                className={`flex-1 ${inputCls} ${hasError("text") ? borderError : borderNormal}`}
                placeholder="Слово или словосочетание"
              />
              <select
                value={item.difficulty}
                onChange={(e) => updateItem(i, { difficulty: Number(e.target.value) })}
                className={`${inputCls} px-2 ${hasError("difficulty") ? borderError : borderNormal}`}
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {task.items.length > 1 && (
                <button
                  onClick={() => removeItem(i)}
                  className="text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 text-sm px-2 py-2 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  title="Удалить вариант"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={addItem}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
      >
        + Добавить вариант
      </button>
    </div>
  );
}
