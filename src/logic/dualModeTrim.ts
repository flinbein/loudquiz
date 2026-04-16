import type { QuestionsFile } from "@/types/game";

export function trimQuestionsFileForDual(
  file: QuestionsFile,
  teamMode: "single" | "dual",
): QuestionsFile {
  if (teamMode !== "dual") return file;

  let topics = file.topics;
  const totalQuestions = topics.reduce((s, t) => s + t.questions.length, 0);
  if (totalQuestions % 2 !== 0 && totalQuestions > 0) {
    const lastTopic = topics[topics.length - 1]!;
    if (lastTopic.questions.length <= 1) {
      topics = topics.slice(0, -1);
    } else {
      topics = topics.map((t, i) =>
        i === topics.length - 1
          ? { ...t, questions: t.questions.slice(0, -1) }
          : t,
      );
    }
  }

  let blitzTasks = file.blitzTasks;
  if (blitzTasks.length % 2 !== 0 && blitzTasks.length > 0) {
    blitzTasks = blitzTasks.slice(0, -1);
  }

  return { topics, blitzTasks };
}
