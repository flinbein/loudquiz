import type { PublicTopicRow } from "../../game/types";

interface QuestionHistoryEntry {
  questionId: string;
  teamId: string;
  score: number;
}

interface QuestionTableProps {
  questionTable: PublicTopicRow[];
  activeQuestionId?: string;
  questionHistory?: QuestionHistoryEntry[];
  onPick?: ((topicIdx: number, questionIdx: number) => void) | null;
  compact?: boolean;
}

export function QuestionTable({
  questionTable,
  activeQuestionId,
  questionHistory = [],
  onPick,
  compact = false,
}: QuestionTableProps) {
  if (questionTable.length === 0) return null;

  const historyMap = new Map(questionHistory.map((h) => [h.questionId, h]));

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {questionTable.map((topic, ti) => (
              <th
                key={ti}
                className="px-2 py-2 text-center text-gray-300 font-semibold border border-gray-700 bg-gray-800 text-xs"
              >
                {topic.topicName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {questionTable[0]?.questions.map((_, qi) => (
            <tr key={qi}>
              {questionTable.map((topic, ti) => {
                const q = topic.questions[qi];
                if (!q) return <td key={ti} />;

                const history = historyMap.get(q.id);
                const isActive = q.id === activeQuestionId;
                const isAnswered = !!history;
                const clickable = !q.used && !isAnswered && !!onPick;

                let cellClass =
                  "px-2 border border-gray-700 font-bold transition-colors text-center ";
                cellClass += compact ? "py-2 " : "py-3 ";

                if (isActive) {
                  cellClass += "ring-2 ring-inset ring-yellow-400 bg-yellow-900/30 text-yellow-200 ";
                  if (clickable) cellClass += "cursor-pointer hover:bg-yellow-700/40 ";
                } else if (isAnswered && history) {
                  if (history.teamId === "red") {
                    cellClass += "bg-red-900/50 text-red-200 border-red-800/50 ";
                  } else {
                    cellClass += "bg-blue-900/50 text-blue-200 border-blue-800/50 ";
                  }
                } else if (q.used) {
                  cellClass += "bg-gray-800/50 text-gray-600 ";
                } else if (clickable) {
                  cellClass += "bg-gray-700/30 text-white hover:bg-blue-700/40 cursor-pointer ";
                } else {
                  cellClass += "bg-gray-700/30 text-white ";
                }

                const content =
                  isAnswered && history ? (
                    <span>
                      <span className="block">{q.difficulty}</span>
                      <span className="text-xs opacity-70">+{history.score}</span>
                    </span>
                  ) : (
                    <span className={q.used ? "line-through" : ""}>{q.difficulty}</span>
                  );

                return (
                  <td
                    key={ti}
                    onClick={() => clickable && onPick?.(ti, qi)}
                    className={cellClass}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
