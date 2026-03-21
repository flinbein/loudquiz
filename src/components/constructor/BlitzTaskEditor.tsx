import { type BlitzTask, type BlitzItem } from "../../game/types";
import { validateBlitzItem, emptyBlitzItem } from "./constructorUtils";

interface Props {
  task: BlitzTask;
  index: number;
  onChange: (t: BlitzTask) => void;
  onDelete: () => void;
}

const DIFFICULTIES = Array.from({ length: 21 }, (_, i) => 200 + i * 10);

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
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm font-medium">Задание {index + 1}</span>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 text-sm px-2 py-0.5 rounded hover:bg-red-900/30 transition-colors"
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
                className={`flex-1 bg-gray-900 text-white rounded px-3 py-2 text-sm border ${
                  hasError("text") ? "border-red-500" : "border-gray-600"
                } focus:outline-none focus:border-blue-500`}
                placeholder="Слово или словосочетание"
              />
              <select
                value={item.difficulty}
                onChange={(e) => updateItem(i, { difficulty: Number(e.target.value) })}
                className={`bg-gray-900 text-white rounded px-2 py-2 text-sm border ${
                  hasError("difficulty") ? "border-red-500" : "border-gray-600"
                } focus:outline-none focus:border-blue-500`}
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
                  className="text-red-400 hover:text-red-300 text-sm px-2 py-2 rounded hover:bg-red-900/30 transition-colors"
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
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        + Добавить вариант
      </button>
    </div>
  );
}
