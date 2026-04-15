import { useGameStore } from "@/store/gameStore";
import { shouldAutoAdvance } from "@/logic/topicsSuggest";
import { getOnlinePlayers } from "@/store/selectors";
import { createNextRoundState } from "@/logic/phaseTransitions";
import { createTimer, getCaptainTimerDuration } from "@/logic/timer";
import type { TeamId, TopicsSuggestState } from "@/types/game";

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
