import { useGameStore } from "@/store/gameStore";
import { shouldAutoAdvance } from "@/logic/topicsSuggest";
import { getOnlinePlayers } from "@/store/selectors";
import { createNextRoundState } from "@/logic/phaseTransitions";
import { createTimer, getCaptainTimerDuration, getTopicsSuggestTimerDuration } from "@/logic/timer";
import type { BlitzTask, Question, TeamId, Topic, TopicsSuggestState } from "@/types/game";

function mutateTopicsSuggest(fn: (ts: TopicsSuggestState) => TopicsSuggestState): void {
  const s = useGameStore.getState();
  if (!s.topicsSuggest) return;
  useGameStore.getState().setState({ topicsSuggest: fn(s.topicsSuggest) });
}

export function submitTopicSuggestion(playerName: string, topic: string): void {
  const text = topic.trim();
  if (!text) return;
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics !== null) return;
  if (s.topicsSuggest.noIdeas.includes(playerName)) return;
  const existing = s.topicsSuggest.suggestions[playerName] ?? [];
  if (existing.length >= s.settings.topicCount) return;

  mutateTopicsSuggest((ts) => ({
    ...ts,
    suggestions: { ...ts.suggestions, [playerName]: [...existing, text] },
  }));
  checkAutoAdvance();
}

export function playerNoIdeas(playerName: string): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics !== null) return;
  if (s.topicsSuggest.noIdeas.includes(playerName)) return;

  mutateTopicsSuggest((ts) => ({
    ...ts,
    noIdeas: [...ts.noIdeas, playerName],
  }));
  checkAutoAdvance();
}

export function startFirstRound(teamIdOrRandom: TeamId | "random"): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-preview") return;
  let teamId: TeamId;
  if (teamIdOrRandom === "random") {
    const teams = s.teams.filter((t) => t.id !== "none");
    if (teams.length === 0) return;
    teamId = teams[Math.floor(Math.random() * teams.length)]!.id;
  } else {
    teamId = teamIdOrRandom;
    if (teamId === "none") return;
    if (!s.teams.some((t) => t.id === teamId)) return;
  }
  useGameStore.getState().setState({
    phase: "round-captain",
    currentRound: createNextRoundState(teamId),
    timer: createTimer(getCaptainTimerDuration()),
    topicsSuggest: undefined,
  });
}

export function checkAutoAdvance(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics !== null) return;
  const online = getOnlinePlayers(s).map((p) => p.name);
  if (!shouldAutoAdvance(online, s.topicsSuggest.suggestions, s.topicsSuggest.noIdeas, s.settings.topicCount)) return;
  startGeneration();
}

export function handleTimerExpiry(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics !== null) return;
  startGeneration();
}

export function startGeneration(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  const manual = s.topicsSuggest.manualTopics;
  const step: "topics" | "questions" = manual && manual.length > 0 ? "questions" : "topics";
  const next: TopicsSuggestState = {
    ...s.topicsSuggest,
    timerEndsAt: null,
    generationStep: step,
    aiError: null,
  };
  const extra =
    manual && manual.length > 0
      ? { topics: manual.map((name) => ({ name, questions: [] })) }
      : {};
  useGameStore.getState().setState({
    phase: "topics-generating",
    topicsSuggest: next,
    timer: null,
    ...extra,
  });
}

export function hostStartManualTopics(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  useGameStore.getState().setState({
    topicsSuggest: {
      ...s.topicsSuggest,
      manualTopics: [],
      timerEndsAt: null,
    },
    timer: null,
  });
}

export function hostCancelManualTopics(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  if (s.topicsSuggest.manualTopics === null) return;
  const timer = createTimer(getTopicsSuggestTimerDuration());
  useGameStore.getState().setState({
    topicsSuggest: {
      ...s.topicsSuggest,
      manualTopics: null,
      timerEndsAt: timer.startedAt + timer.duration,
    },
    timer,
  });
}

export function hostSubmitManualTopics(topics: string[]): void {
  const clean = topics.map((t) => t.trim()).filter((t) => t.length > 0);
  if (clean.length === 0) return;
  const s = useGameStore.getState();
  if (s.phase !== "topics-collecting" || !s.topicsSuggest) return;
  useGameStore.getState().setState({
    topicsSuggest: {
      ...s.topicsSuggest,
      manualTopics: clean,
      timerEndsAt: null,
    },
    timer: null,
  });
  startGeneration();
}

export type AiStepResult =
  | { topics: string[] }
  | { topics: Topic[] }
  | { blitzTasks: BlitzTask[] };

export function onAiStepSuccess(
  step: "topics" | "questions" | "blitz",
  result: AiStepResult,
): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-generating" || !s.topicsSuggest) return;
  if (s.topicsSuggest.generationStep !== step) return;

  if (step === "topics") {
    const names = (result as { topics: string[] }).topics;
    useGameStore.getState().setState({
      topics: names.map((name) => ({ name, questions: [] as Question[] })),
      topicsSuggest: {
        ...s.topicsSuggest,
        generationStep: "questions",
        aiError: null,
      },
    });
    return;
  }

  if (step === "questions") {
    const payload = (result as { topics: Topic[] }).topics;
    useGameStore.getState().setState({
      topics: payload,
      topicsSuggest: {
        ...s.topicsSuggest,
        generationStep: "blitz",
        aiError: null,
      },
    });
    return;
  }

  const payload = (result as { blitzTasks: BlitzTask[] }).blitzTasks;
  useGameStore.getState().setState({
    blitzTasks: payload,
    phase: "topics-preview",
    topicsSuggest: undefined,
  });
}

export function onAiStepError(step: "topics" | "questions" | "blitz", message: string): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-generating" || !s.topicsSuggest) return;
  useGameStore.getState().setState({
    topicsSuggest: { ...s.topicsSuggest, aiError: { step, message } },
  });
}

export function retryAiStep(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-generating" || !s.topicsSuggest) return;
  if (!s.topicsSuggest.aiError) return;
  useGameStore.getState().setState({
    topicsSuggest: { ...s.topicsSuggest, aiError: null },
  });
}

export function fallbackToManualTopics(): void {
  const s = useGameStore.getState();
  if (s.phase !== "topics-generating" || !s.topicsSuggest) return;
  if (s.topicsSuggest.aiError?.step !== "topics") return;
  useGameStore.getState().setState({
    phase: "topics-collecting",
    topicsSuggest: {
      ...s.topicsSuggest,
      manualTopics: [],
      generationStep: null,
      aiError: null,
      timerEndsAt: null,
    },
    timer: null,
  });
}
