import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { generateTopics } from "@/ai/topicGeneration";
import { generateQuestions } from "@/ai/questionGeneration";
import { generateBlitzTasks } from "@/ai/blitzGeneration";
import { trimQuestionsFileForDual } from "@/logic/dualModeTrim";
import { checkAnswers } from "@/ai/answerCheck";
import {
  onAiStepSuccess,
  onAiStepError,
  handleTimerExpiry,
} from "@/store/actions/topicsSuggest";
import {
  beginAiReview,
  onAiReviewSuccess,
  onAiReviewError,
} from "@/store/actions/aiReview";
import { confirmScore } from "@/store/actions/round";
import { getApiKey } from "@/persistence/localPersistence";
import i18n from "@/i18n";
import type { GameState, AnswerEvaluation } from "@/types/game";

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function flattenSuggestions(
  suggestions: Record<string, string[]>,
): { playerName: string; text: string }[] {
  const out: { playerName: string; text: string }[] = [];
  for (const [playerName, texts] of Object.entries(suggestions)) {
    for (const text of texts) out.push({ playerName, text });
  }
  return out;
}

function getPlayersPerTeam(state: GameState): number {
  const realTeams = state.teams.filter((t) => t.id !== "none");
  const divisor = Math.max(1, realTeams.length);
  return Math.max(2, Math.ceil(state.players.length / divisor));
}

function getCurrentQuestion(state: GameState) {
  const idx = state.currentRound?.questionIndex;
  if (idx == null) return undefined;
  let remaining = idx;
  for (const topic of state.topics) {
    if (remaining < topic.questions.length) return topic.questions[remaining];
    remaining -= topic.questions.length;
  }
  return undefined;
}

function buildEvaluationsAndGroups(
  results: {
    playerName: string;
    accepted: boolean;
    group: number | null;
    note: string | null;
  }[],
): { evaluations: AnswerEvaluation[]; groups: string[][] } {
  const evaluations: AnswerEvaluation[] = results.map((r) => ({
    playerName: r.playerName,
    correct: r.accepted,
    aiComment: r.note ?? undefined,
  }));

  const byGroup = new Map<number, string[]>();
  const singletons: string[][] = [];
  for (const r of results) {
    if (r.group == null) {
      singletons.push([r.playerName]);
    } else {
      const arr = byGroup.get(r.group) ?? [];
      arr.push(r.playerName);
      byGroup.set(r.group, arr);
    }
  }
  const groups: string[][] = [...byGroup.values(), ...singletons];
  return { evaluations, groups };
}

export function useAiOrchestrator(isHost: boolean): void {
  const runningRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reviewRunningRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHost) return;

    function handle(state: GameState, prev: GameState): void {
      if (state.phase === "topics-collecting" && state.topicsSuggest?.timerEndsAt) {
        if (timerRef.current) clearTimeout(timerRef.current);
        const remaining = state.topicsSuggest.timerEndsAt - performance.now();
        if (remaining <= 0) {
          handleTimerExpiry();
        } else {
          timerRef.current = setTimeout(() => handleTimerExpiry(), remaining);
        }
      } else if (timerRef.current && state.phase !== "topics-collecting") {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (
        state.phase === "topics-generating" &&
        state.topicsSuggest &&
        !state.topicsSuggest.aiError
      ) {
        const step = state.topicsSuggest.generationStep;
        const key = `${step}:${state.topics.length}:${state.blitzTasks.length}`;
        if (step && runningRef.current !== key) {
          runningRef.current = key;
          const apiKey = getApiKey();
          const language = i18n.language || "ru";
          if (step === "topics") {
            generateTopics(
              apiKey,
              {
                suggestions: flattenSuggestions(state.topicsSuggest.suggestions),
                topicCount: state.settings.topicCount,
                pastTopics: [],
              },
              language,
            )
              .then((r) => onAiStepSuccess("topics", { topics: r.topics.map((t) => t.name) }))
              .catch((e) => onAiStepError("topics", errorMessage(e)));
          } else if (step === "questions") {
            generateQuestions(
              apiKey,
              {
                topics: state.topics.map((t) => t.name),
                questionsPerTopic: state.settings.questionsPerTopic,
                playersPerTeam: getPlayersPerTeam(state),
                pastQuestions: state.settings.pastQuestions,
              },
              language,
            )
              .then((r) => onAiStepSuccess("questions", { topics: r.topics }))
              .catch((e) => onAiStepError("questions", errorMessage(e)));
          } else if (step === "blitz") {
            const realTeamCount = Math.max(
              1,
              state.teams.filter((t) => t.id !== "none").length,
            );
            generateBlitzTasks(
              apiKey,
              {
                rounds: state.settings.blitzRoundsPerTeam * realTeamCount,
                tasksPerRound: getPlayersPerTeam(state),
                pastTasks: [],
              },
              language,
            )
              .then((r) => {
                let blitzTasks = r.rounds.map((round) => ({ items: round.items }));
                const trimmed = trimQuestionsFileForDual(
                  { topics: [], blitzTasks },
                  useGameStore.getState().settings.teamMode,
                );
                onAiStepSuccess("blitz", { blitzTasks: trimmed.blitzTasks });
              })
              .catch((e) => onAiStepError("blitz", errorMessage(e)));
          }
        }
      } else if (state.phase !== "topics-generating") {
        runningRef.current = null;
      }

      if (
        state.phase === "round-review" &&
        state.settings.mode === "ai" &&
        state.currentRound?.reviewResult?.aiStatus === "idle"
      ) {
        beginAiReview();
      }

      if (
        state.phase === "round-review" &&
        state.currentRound?.reviewResult?.aiStatus === "loading" &&
        prev.currentRound?.reviewResult?.aiStatus !== "loading"
      ) {
        const round = state.currentRound!;
        const question = getCurrentQuestion(state);
        const runKey = `${round.teamId}:${round.questionIndex}`;
        if (reviewRunningRef.current !== runKey) {
          reviewRunningRef.current = runKey;
          if (!question) {
            onAiReviewError("question not found");
          } else {
            const apiKey = getApiKey();
            const language = i18n.language || "ru";
            const answers = Object.entries(round.answers)
              .map(([playerName, a]) => ({ playerName, answer: a.text }));
            console.log("===== checkAnswers")
            checkAnswers(
              apiKey,
              {
                captainName: round.captainName,
                question: question.text,
                answers,
              },
              language,
            )
              .then((r) => onAiReviewSuccess(buildEvaluationsAndGroups(r.results), r.comment))
              .catch((e) => onAiReviewError(errorMessage(e)));
          }
        }
      }

      if (state.phase !== "round-review") {
        reviewRunningRef.current = null;
      }

      if (
        state.phase === "round-review" &&
        state.currentRound?.reviewResult?.aiStatus === "done" &&
        prev.currentRound?.reviewResult?.aiStatus !== "done"
      ) {
        confirmScore();
      }
    }

    const unsubscribe = useGameStore.subscribe((state, prev) => handle(state, prev));
    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isHost]);
}
