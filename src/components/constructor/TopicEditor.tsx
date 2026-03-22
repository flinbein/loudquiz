import { type Topic, type Question } from "../../game/types";
import { emptyQuestion } from "./constructorUtils";
import QuestionEditor from "./QuestionEditor";

interface Props {
  topic: Topic;
  index: number;
  onChange: (t: Topic) => void;
  onDelete: () => void;
  apiKey?: string;
}

export default function TopicEditor({ topic, index, onChange, onDelete, apiKey }: Props) {
  function updateQuestion(qi: number, q: Question) {
    const questions = topic.questions.map((old, i) => (i === qi ? q : old));
    onChange({ ...topic, questions });
  }

  function deleteQuestion(qi: number) {
    onChange({ ...topic, questions: topic.questions.filter((_, i) => i !== qi) });
  }

  function addQuestion() {
    onChange({ ...topic, questions: [...topic.questions, emptyQuestion()] });
  }

  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-xl p-5 space-y-4 bg-slate-50 dark:bg-slate-800/50">
      {/* Topic header */}
      <div className="flex items-center gap-3">
        <span className="text-slate-500 dark:text-slate-400 text-sm shrink-0">Тема {index + 1}</span>
        <input
          type="text"
          value={topic.name}
          onChange={(e) => onChange({ ...topic, name: e.target.value })}
          className={`flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-base font-semibold border ${
            topic.name.trim() === "" ? "border-red-400 dark:border-red-500" : "border-slate-300 dark:border-slate-600"
          } focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
          placeholder="Название темы"
        />
        <button
          onClick={onDelete}
          className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 text-sm px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shrink-0"
        >
          Удалить тему
        </button>
      </div>

      {/* Questions */}
      <div className="space-y-3 pl-2">
        {topic.questions.map((q, qi) => (
          <QuestionEditor
            key={q.id}
            question={q}
            index={qi}
            onChange={(updated) => updateQuestion(qi, updated)}
            onDelete={() => deleteQuestion(qi)}
            apiKey={apiKey}
          />
        ))}
      </div>

      <button
        onClick={addQuestion}
        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 text-sm px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
      >
        + Добавить вопрос
      </button>
    </div>
  );
}
