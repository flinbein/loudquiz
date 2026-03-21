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
    <div className="border border-gray-600 rounded-xl p-5 space-y-4 bg-gray-850">
      {/* Topic header */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400 text-sm shrink-0">Тема {index + 1}</span>
        <input
          type="text"
          value={topic.name}
          onChange={(e) => onChange({ ...topic, name: e.target.value })}
          className={`flex-1 bg-gray-900 text-white rounded px-3 py-2 text-base font-semibold border ${
            topic.name.trim() === "" ? "border-red-500" : "border-gray-600"
          } focus:outline-none focus:border-blue-500`}
          placeholder="Название темы"
        />
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 text-sm px-3 py-1.5 rounded border border-red-800 hover:bg-red-900/30 transition-colors shrink-0"
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
        className="text-blue-400 hover:text-blue-300 text-sm px-3 py-1.5 rounded border border-blue-800 hover:bg-blue-900/30 transition-colors"
      >
        + Добавить вопрос
      </button>
    </div>
  );
}
