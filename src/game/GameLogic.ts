import type {
  FullGameState,
  PublicGameState,
  PublicPlayerInfo,
  GameSettings,
  QuestionsFile,
  AnswerGroup,
  PublicTopicRow,
  GameStats,
  BlitzItem,
} from "./types";
import type { PlayerToHostMsg, HostMsg, BlitzTaskPublic } from "./messages";
import { generateTopics, generateQuestions, generateBlitzTasks, checkAnswers } from "./ai/aiConstructor";
import {
  calculateRoundScore,
  computeBlitzScore,
  computeChainLength,
  balanceQuestions,
  computeGameStats,
} from "./scoring";

const TOPIC_SUGGEST_DURATION_MS = 60_000;

export interface GameLogicCallbacks {
  broadcast: (msg: HostMsg) => void;
  onStateChange: (state: FullGameState) => void;
  sendTo?: (playerId: string, msg: HostMsg) => void;
  onKickPlayer?: (playerId: string) => void;
}

export class GameLogic {
  private state: FullGameState;
  private readySet = new Set<string>();
  private suggestionsList: Array<{ playerName: string; text: string }> = [];
  private noIdeasSet = new Set<string>();
  private suggestCounts = new Map<string, number>();
  private topicSuggestTimer: ReturnType<typeof setTimeout> | null = null;
  private roundTimer: ReturnType<typeof setTimeout> | null = null;
  private answerTimer: ReturnType<typeof setTimeout> | null = null;
  private blitzTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly callbacks: GameLogicCallbacks,
    settings: GameSettings,
  ) {
    const scores: Record<string, number> =
      settings.teamCount === 2 ? { red: 0, blue: 0 } : { red: 0 };
    const jokerUsed: Record<string, boolean> =
      settings.teamCount === 2 ? { red: false, blue: false } : { red: false };
    this.state = {
      phase: "lobby",
      activeTeamId: null,
      scores,
      players: [],
      jokerUsed,
      jokerActivatedThisRound: {},
      serverNow: Date.now(),
      questionTable: [],
      topicNames: [],
      allAnswers: {},
      usedQuestionIds: [],
      settings,
      blitzTasks: [],
      usedBlitzTaskIds: [],
      lastCaptainByTeam: {},
      captainCountByPlayer: {},
      acceptedAnswerCountByPlayer: {},
    };
  }

  getFullState(): FullGameState {
    return this.state;
  }

  getPublicState(): PublicGameState {
    const {
      questionTable,
      topicNames,
      allAnswers,
      currentQuestion,
      settings,
      blitzTasks,
      usedBlitzTaskIds,
      currentBlitzItem,
      blitzStartedAt,
      blitzTotalTimeMs,
      blitzAnswers,
      lastCaptainByTeam,
      captainCountByPlayer,
      acceptedAnswerCountByPlayer,
      ...pub
    } = this.state;

    // Build public question table (no question text)
    let publicQuestionTable: PublicTopicRow[] | undefined;
    const roundPhases = [
      "round-pick",
      "round-captain",
      "round-ready",
      "round-active",
      "round-answer",
      "round-review",
      "round-result",
    ];
    // Also expose after AI generation in topic-suggest so players can preview questions
    const showTable = roundPhases.includes(pub.phase) ||
      (pub.phase === "topic-suggest" && pub.questionsReady);
    if (questionTable.length > 0 && showTable) {
      publicQuestionTable = questionTable.map((qs, ti) => ({
        topicName: topicNames[ti] ?? `Тема ${ti + 1}`,
        questions: qs.map((q) => ({
          id: q.id,
          difficulty: q.difficulty,
          used: (this.state.usedQuestionIds ?? []).includes(q.id),
        })),
      }));
    }

    // Reveal question text in review/result/answer phases; also reveal to non-active team in round-active
    let questionRevealText: string | undefined;
    if (
      pub.phase === "round-review" ||
      pub.phase === "round-result" ||
      pub.phase === "round-answer" ||
      pub.phase === "round-active"
    ) {
      questionRevealText = currentQuestion?.text;
    }

    // Reveal blitz task in blitz-result
    let blitzTaskReveal: { text: string; difficulty: number } | undefined;
    if (pub.phase === "blitz-result" && currentBlitzItem) {
      blitzTaskReveal = { text: currentBlitzItem.text, difficulty: currentBlitzItem.difficulty };
    }

    // Game stats in finale
    let gameStats: GameStats | undefined;
    if (pub.phase === "finale") {
      const nameById: Record<string, string> = {};
      for (const p of pub.players) nameById[p.id] = p.name;
      gameStats = computeGameStats(captainCountByPlayer, acceptedAnswerCountByPlayer, nameById);
    }

    // Public blitz tasks — only shown in blitz-captain phase (item difficulties only, no text)
    let publicBlitzTasks: Array<{ id: string; itemDifficulties: number[]; used: boolean; word?: string }> | undefined;
    if (blitzTasks.length > 0 && pub.phase === "blitz-captain") {
      publicBlitzTasks = blitzTasks.map((t) => ({
        id: t.id,
        itemDifficulties: (t.items ?? []).map((i) => i.difficulty),
        used: usedBlitzTaskIds.includes(t.id),
      }));
    }

    return {
      ...pub,
      serverNow: Date.now(),
      publicQuestionTable,
      questionRevealText,
      blitzTaskReveal,
      gameStats,
      publicBlitzTasks,
      questionHistory: this.state.questionHistory,
      settings: {
        teamCount: settings.teamCount,
        gameMode: settings.gameMode,
        hostType: settings.hostType,
      },
    };
  }

  getPrivateMessagesForPlayer(playerId: string): HostMsg[] {
    const msgs: HostMsg[] = [];
    if (this.state.captainId === playerId) {
      const phase = this.state.phase;
      if (phase === "round-pick" || phase === "round-ready" || phase === "round-active" || phase === "round-answer") {
        const q = this.state.currentQuestion;
        if (q) msgs.push({ type: "captainInfo", info: { questionText: q.text } });
      } else if (phase === "blitz-active" || phase === "blitz-answer" || phase === "blitz-ready") {
        const item = this.state.currentBlitzItem;
        if (item) msgs.push({ type: "blitzCaptainInfo", item });
      } else if (phase === "blitz-pick") {
        const task = this.state.blitzTasks.find((t) => t.id === this.state.pickedBlitzTaskId);
        if (task) {
          const tasks: BlitzTaskPublic[] = [{
            id: task.id,
            items: task.items.map((i) => ({ text: i.text, difficulty: i.difficulty })),
            used: false,
          }];
          msgs.push({ type: "blitzTaskList", tasks });
        }
      }
    }
    return msgs;
  }

  private broadcastState(): void {
    this.callbacks.broadcast({ type: "syncState", state: this.getPublicState() });
    this.callbacks.onStateChange(this.state);
    if (this.callbacks.sendTo && this.state.captainId) {
      for (const msg of this.getPrivateMessagesForPlayer(this.state.captainId)) {
        this.callbacks.sendTo(this.state.captainId, msg);
      }
    }
  }

  /** Process a message from a player. Returns a direct reply (if any) to send back to that player. */
  handleMessage(playerId: string, msg: PlayerToHostMsg): HostMsg | null {
    switch (msg.type) {
      case "join": {
        const exists = this.state.players.some((p) => p.id === playerId);
        if (!exists) {
          const teamId =
            msg.role === "spectator"
              ? null
              : this.state.settings.teamCount === 1
                ? "red"
                : null;
          const playerInfo: PublicPlayerInfo = {
            id: playerId,
            name: msg.name,
            role: msg.role,
            teamId,
            hasAnswered: false,
            isReady: false,
            wasRecentCaptain: false,
            online: true,
          };
          this.state = { ...this.state, players: [...this.state.players, playerInfo] };
        } else {
          this.state = {
            ...this.state,
            players: this.state.players.map((p) =>
              p.id === playerId ? { ...p, name: msg.name, role: msg.role, online: true } : p,
            ),
          };
        }
        this.broadcastState();
        return { type: "syncState", state: this.getPublicState() };
      }

      case "setTeam": {
        if (this.state.phase !== "lobby") return null;
        const { teamId } = msg;
        if (teamId !== null && teamId !== "red" && teamId !== "blue") return null;
        if (teamId === "blue" && this.state.settings.teamCount !== 2) return null;
        this.state = {
          ...this.state,
          players: this.state.players.map((p) =>
            p.id === playerId ? { ...p, teamId } : p,
          ),
        };
        this.broadcastState();
        return null;
      }

      case "startGame": {
        if (this.state.phase !== "lobby") return null;
        this.startGame();
        return null;
      }

      case "ready": {
        if (
          this.state.phase !== "calibration" &&
          this.state.phase !== "round-ready" &&
          this.state.phase !== "blitz-ready"
        ) return null;
        this.readySet.add(playerId);
        this.state = {
          ...this.state,
          players: this.state.players.map((p) =>
            p.id === playerId ? { ...p, isReady: true } : p,
          ),
        };
        this.broadcastState();
        if (this.state.phase === "round-ready") {
          this.checkRoundReady();
        } else if (this.state.phase === "blitz-ready") {
          this.checkBlitzReadyForActive();
        } else {
          this.checkAllReady();
        }
        return null;
      }

      case "suggest": {
        if (this.state.phase !== "topic-suggest") return null;
        const count = this.suggestCounts.get(playerId) ?? 0;
        if (count >= 3) return null;
        const text = msg.text.trim();
        if (!text) return null;
        this.suggestCounts.set(playerId, count + 1);
        const player = this.state.players.find((p) => p.id === playerId);
        this.suggestionsList = [
          ...this.suggestionsList,
          { playerName: player?.name ?? "Игрок", text },
        ];
        this.state = { ...this.state, suggestions: this.suggestionsList };
        this.broadcastState();
        return null;
      }

      case "noIdeas": {
        if (this.state.phase !== "topic-suggest") return null;
        this.noIdeasSet.add(playerId);
        this.checkAllNoIdeas();
        return null;
      }

      case "becomeCapitain": {
        if (this.state.phase !== "round-captain") return null;
        if (this.state.captainId) return null;
        const player = this.state.players.find(
          (p) => p.id === playerId && p.teamId === this.state.activeTeamId,
        );
        if (!player) return null;
        if (player.wasRecentCaptain) return null;
        const captainCountByPlayer = { ...this.state.captainCountByPlayer };
        captainCountByPlayer[playerId] = (captainCountByPlayer[playerId] ?? 0) + 1;
        this.state = { ...this.state, captainId: playerId, captainCountByPlayer };
        this.broadcastState();
        setTimeout(() => this.startRoundPick(), 500);
        return null;
      }

      case "pickQuestion": {
        if (this.state.phase !== "round-pick") return null;
        if (this.state.captainId !== playerId) return null;
        const { topicIdx, questionIdx } = msg;
        const topic = this.state.questionTable[topicIdx];
        if (!topic) return null;
        const question = topic[questionIdx];
        if (!question) return null;
        if (this.state.usedQuestionIds.includes(question.id)) return null;
        // Store picked indices and question; transition to round-ready
        this.state = { ...this.state, currentQuestion: question, pickedTopicIdx: topicIdx, pickedQuestionIdx: questionIdx };
        this.startRoundReady();
        return null; // captain gets captainInfo via getPrivateMessagesForPlayer
      }

      case "activateJoker": {
        if (this.state.phase !== "round-pick") return null;
        if (this.state.captainId !== playerId) return null;
        const activeTeam = this.state.activeTeamId!;
        if (this.state.jokerUsed[activeTeam]) return null;
        if (this.state.jokerActivatedThisRound[activeTeam]) return null;
        this.state = {
          ...this.state,
          jokerActivatedThisRound: { ...this.state.jokerActivatedThisRound, [activeTeam]: true },
        };
        this.broadcastState();
        return null;
      }

      case "submitAnswer": {
        if (this.state.phase !== "round-active" && this.state.phase !== "round-answer") return null;
        const playerA = this.state.players.find((p) => p.id === playerId);
        if (!playerA || playerA.teamId !== this.state.activeTeamId || playerA.role !== "player")
          return null;
        const answer = msg.answer.trim();
        if (!answer) return null;
        this.state = {
          ...this.state,
          allAnswers: { ...this.state.allAnswers, [playerId]: answer },
          players: this.state.players.map((p) =>
            p.id === playerId ? { ...p, hasAnswered: true } : p,
          ),
        };
        this.broadcastState();
        this.checkAllAnswered();
        return null;
      }

      case "proceed": {
        if (this.state.phase !== "topic-suggest" || !this.state.questionsReady) return null;
        this.proceedFromSetup();
        return null;
      }

      case "nextRound": {
        if (this.state.phase !== "round-result" && this.state.phase !== "blitz-result") return null;
        this.goToNextRound();
        return null;
      }

      case "restart": {
        if (this.state.phase !== "finale") return null;
        this.restartGame();
        return null;
      }

      case "blitzBecomeCapitain": {
        if (this.state.phase !== "blitz-captain") return null;
        if (this.state.captainId) return null;
        const playerB = this.state.players.find((p) => p.id === playerId);
        if (!playerB || playerB.teamId !== this.state.activeTeamId) return null;
        if (playerB.wasRecentCaptain) return null;
        const captainCountByPlayer = { ...this.state.captainCountByPlayer };
        captainCountByPlayer[playerId] = (captainCountByPlayer[playerId] ?? 0) + 1;
        this.state = {
          ...this.state,
          captainId: playerId,
          captainCountByPlayer,
          players: this.state.players.map((p) =>
            p.id === playerId ? { ...p, blitzOrder: 0 } : p,
          ),
        };
        this.broadcastState();
        this.checkBlitzCaptainReady();
        return null;
      }

      case "blitzSetOrder": {
        if (this.state.phase !== "blitz-captain") return null;
        const playerO = this.state.players.find((p) => p.id === playerId);
        if (!playerO || playerO.teamId !== this.state.activeTeamId || playerO.role !== "player")
          return null;
        if (playerO.id === this.state.captainId) return null;
        const pos = msg.position;
        if (pos < 1) return null;
        const taken = this.state.players.some(
          (p) => p.id !== playerId && p.blitzOrder === pos,
        );
        if (taken) return null;
        this.state = {
          ...this.state,
          players: this.state.players.map((p) =>
            p.id === playerId ? { ...p, blitzOrder: pos } : p,
          ),
        };
        this.broadcastState();
        this.checkBlitzCaptainReady();
        return null;
      }

      case "blitzPickTask": {
        if (this.state.phase !== "blitz-pick") return null;
        if (this.state.captainId !== playerId) return null;
        const taskId = this.state.pickedBlitzTaskId;
        if (!taskId) return null;
        const task = this.state.blitzTasks.find((t) => t.id === taskId);
        if (!task) return null;
        const item = task.items[msg.itemIdx];
        if (!item) return null;
        this.startBlitzReadyForBlitz(taskId, item);
        return null; // captain gets blitzCaptainInfo via getPrivateMessagesForPlayer
      }

      case "blitzSubmitAnswer": {
        if (this.state.phase !== "blitz-active" && this.state.phase !== "blitz-answer") return null;
        const playerS = this.state.players.find((p) => p.id === playerId);
        if (!playerS || playerS.teamId !== this.state.activeTeamId || playerS.role !== "player")
          return null;
        if (playerS.id === this.state.captainId) return null;
        const answerB = msg.answer.trim();
        if (!answerB) return null;
        this.state = {
          ...this.state,
          blitzAnswers: { ...(this.state.blitzAnswers ?? {}), [playerId]: answerB },
          players: this.state.players.map((p) =>
            p.id === playerId ? { ...p, hasAnswered: true } : p,
          ),
        };
        this.broadcastState();
        this.checkAllBlitzAnswered();
        return null;
      }

      case "surrender": {
        if (this.state.phase !== "blitz-answer") return null;
        const playerSurr = this.state.players.find((p) => p.id === playerId);
        if (
          !playerSurr ||
          playerSurr.teamId !== this.state.activeTeamId ||
          playerSurr.role !== "player"
        )
          return null;
        if (playerSurr.id === this.state.captainId) return null;
        if (!this.state.blitzAnswers?.[playerId]) {
          this.state = {
            ...this.state,
            blitzAnswers: { ...(this.state.blitzAnswers ?? {}), [playerId]: "" },
            players: this.state.players.map((p) =>
              p.id === playerId ? { ...p, hasAnswered: true } : p,
            ),
          };
          this.broadcastState();
          this.checkAllBlitzAnswered();
        }
        return null;
      }

      case "ping":
        return { type: "pong", t2: Date.now() };

      default:
        return null;
    }
  }

  removePlayer(playerId: string): void {
    this.readySet.delete(playerId);
    this.noIdeasSet.delete(playerId);
    this.state = {
      ...this.state,
      players: this.state.players.filter((p) => p.id !== playerId),
    };
    this.broadcastState();
  }

  setPlayerOnline(playerId: string, online: boolean): void {
    const exists = this.state.players.some((p) => p.id === playerId);
    if (!exists) return;
    this.state = {
      ...this.state,
      players: this.state.players.map((p) => (p.id === playerId ? { ...p, online } : p)),
    };
    this.broadcastState();
  }

  kickPlayer(playerId: string): void {
    this.readySet.delete(playerId);
    this.noIdeasSet.delete(playerId);
    this.state = {
      ...this.state,
      players: this.state.players.filter((p) => p.id !== playerId),
    };
    this.callbacks.onKickPlayer?.(playerId);
    this.broadcastState();
  }

  // ── Host actions ──────────────────────────────────────────────────────────────

  startGame(): void {
    if (this.state.phase !== "lobby") return;
    const activePlayers = this.activePlayers();
    if (activePlayers.length === 0) return;
    this.readySet.clear();
    this.state = {
      ...this.state,
      phase: "calibration",
      players: this.state.players.map((p) => ({ ...p, isReady: false })),
    };
    this.broadcastState();
  }

  forceCalibrationDone(): void {
    if (this.state.phase !== "calibration") return;
    this.transitionFromCalibration();
  }

  forceRoundReady(): void {
    if (this.state.phase !== "round-ready") return;
    this.startRoundActive(this.state.pickedTopicIdx!, this.state.pickedQuestionIdx!);
  }

  forceCaptain(): void {
    if (this.state.phase !== "round-captain") return;
    if (this.state.captainId) return;
    const teamPlayer = this.state.players.find(
      (p) => p.teamId === this.state.activeTeamId && p.role === "player",
    );
    if (!teamPlayer) return;
    const captainCountByPlayer = { ...this.state.captainCountByPlayer };
    captainCountByPlayer[teamPlayer.id] = (captainCountByPlayer[teamPlayer.id] ?? 0) + 1;
    this.state = { ...this.state, captainId: teamPlayer.id, captainCountByPlayer };
    this.broadcastState();
    setTimeout(() => this.startRoundPick(), 500);
  }

  forceBlitzCaptainDone(): void {
    if (this.state.phase !== "blitz-captain") return;
    const activeTeamId = this.state.activeTeamId!;

    // Assign captain if not yet set
    let captainId = this.state.captainId;
    let captainCountByPlayer = { ...this.state.captainCountByPlayer };
    if (!captainId) {
      const teamPlayer = this.state.players.find(
        (p) => p.teamId === activeTeamId && p.role === "player",
      );
      if (!teamPlayer) return;
      captainId = teamPlayer.id;
      captainCountByPlayer[captainId] = (captainCountByPlayer[captainId] ?? 0) + 1;
    }
    const finalCaptainId = captainId;

    // Auto-assign blitz order positions to players who haven't chosen
    const usedOrders = new Set(
      this.state.players
        .filter((p) => p.teamId === activeTeamId && p.id !== finalCaptainId && (p.blitzOrder ?? 0) > 0)
        .map((p) => p.blitzOrder!),
    );
    let nextOrder = 1;
    const newPlayers = this.state.players.map((p) => {
      if (p.id === finalCaptainId) return { ...p, blitzOrder: 0 };
      if (p.teamId === activeTeamId && p.role === "player" && (p.blitzOrder ?? 0) === 0) {
        while (usedOrders.has(nextOrder)) nextOrder++;
        const order = nextOrder++;
        usedOrders.add(order);
        return { ...p, blitzOrder: order };
      }
      return p;
    });

    const ordered = newPlayers
      .filter((p) => p.teamId === activeTeamId && p.role === "player" && p.id !== finalCaptainId)
      .sort((a, b) => (a.blitzOrder ?? 0) - (b.blitzOrder ?? 0))
      .map((p) => p.id);

    this.state = {
      ...this.state,
      captainId,
      captainCountByPlayer,
      players: newPlayers,
      blitzOrder: ordered,
    };
    this.broadcastState();
    this.startBlitzPick();
  }

  forceBlitzReady(): void {
    if (this.state.phase !== "blitz-ready") return;
    this.startBlitzActiveFromReady();
  }

  uploadQuestions(data: QuestionsFile): void {
    if (this.state.phase !== "question-setup") return;
    const isBlitz = this.state.settings.gameMode === "blitz";

    if (isBlitz) {
      const blitzTasks = data.blitzTasks ?? [];
      const activeTeamId = this.pickFirstTeam();
      this.state = { ...this.state, questionTable: [], topicNames: [], blitzTasks, activeTeamId };
      this.startBlitzCaptain(activeTeamId);
      return;
    }

    let questionTable = data.topics.map((t) => t.questions);
    const topicNames = data.topics.map((t) => t.name);
    questionTable = balanceQuestions(questionTable, this.state.settings.teamCount);
    const blitzTasks = data.blitzTasks ?? [];
    this.state = {
      ...this.state,
      phase: "round-captain",
      questionTable,
      topicNames,
      blitzTasks,
      activeTeamId: this.pickFirstTeam(),
    };
    this.broadcastState();
  }

  async generateBlitzTasksAI(count: number): Promise<void> {
    if (this.state.phase !== "question-setup") return;
    const apiKey = this.state.settings.aiApiKey ?? "";
    this.state = { ...this.state, isGeneratingQuestions: true };
    this.broadcastState();
    try {
      const blitzTasks = await generateBlitzTasks(apiKey, { count });
      const activeTeamId = this.pickFirstTeam();
      this.state = { ...this.state, isGeneratingQuestions: false, questionTable: [], topicNames: [], blitzTasks, activeTeamId };
      this.startBlitzCaptain(activeTeamId);
    } catch (err) {
      console.error("Blitz AI generation failed:", err);
      this.state = { ...this.state, isGeneratingQuestions: false };
      this.broadcastState();
    }
  }

  proceedFromTopicSuggest(): void {
    if (this.state.phase !== "topic-suggest" || !this.state.questionsReady) return;
    this.proceedFromSetup();
  }

  confirmReview(groups: AnswerGroup[]): void {
    if (this.state.phase !== "round-review") return;
    this.finalizeRound(groups);
  }

  forceNextRound(): void {
    if (this.state.phase !== "round-result" && this.state.phase !== "blitz-result") return;
    this.goToNextRound();
  }

  forceRoundAnswer(): void {
    if (this.state.phase !== "round-active") return;
    this.clearRoundTimer();
    this.startRoundAnswer();
  }

  forceBlitzResult(): void {
    if (this.state.phase !== "blitz-active" && this.state.phase !== "blitz-answer") return;
    this.clearTimers();
    void this.finalizeBlitz();
  }

  restartGame(): void {
    if (this.state.phase !== "finale") return;
    this.doRestart();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  activePlayers(): PublicPlayerInfo[] {
    return this.state.players.filter((p) => p.teamId !== null);
  }

  isAllPlayersReady(): boolean {
    const active = this.activePlayers();
    if (active.length === 0) return false;
    return active.every((p) => this.readySet.has(p.id));
  }

  getSuggestCountForPlayer(playerId: string): number {
    return this.suggestCounts.get(playerId) ?? 0;
  }

  private activeTeamPlayers(): PublicPlayerInfo[] {
    return this.state.players.filter(
      (p) => p.teamId === this.state.activeTeamId && p.role === "player",
    );
  }

  private activeNonSpectators(): PublicPlayerInfo[] {
    return this.state.players.filter((p) => p.teamId !== null && p.role === "player");
  }

  private checkAllReady(): void {
    if (this.state.phase !== "calibration") return;
    if (this.isAllPlayersReady()) {
      this.transitionFromCalibration();
    }
  }

  private checkAllNoIdeas(): void {
    if (this.state.phase !== "topic-suggest") return;
    const active = this.activeNonSpectators();
    if (active.length === 0) return;
    if (active.every((p) => this.noIdeasSet.has(p.id))) {
      this.endTopicSuggestEarly();
    }
  }

  private transitionFromCalibration(): void {
    // Blitz mode always goes to question-setup (no topic-suggest needed)
    if (this.state.settings.gameMode === "blitz") {
      this.state = { ...this.state, phase: "question-setup" };
      this.broadcastState();
      return;
    }
    if (this.state.settings.hostType === "ai") {
      this.startTopicSuggest();
    } else {
      this.state = { ...this.state, phase: "question-setup" };
      this.broadcastState();
    }
  }

  private startTopicSuggest(): void {
    this.suggestionsList = [];
    this.noIdeasSet.clear();
    this.suggestCounts.clear();
    const endsAt = Date.now() + TOPIC_SUGGEST_DURATION_MS;
    this.state = {
      ...this.state,
      phase: "topic-suggest",
      suggestions: [],
      topicSuggestEndsAt: endsAt,
    };
    this.broadcastState();
    this.topicSuggestTimer = setTimeout(() => {
      void this.endTopicSuggest();
    }, TOPIC_SUGGEST_DURATION_MS);
  }

  private endTopicSuggestEarly(): void {
    if (this.topicSuggestTimer !== null) {
      clearTimeout(this.topicSuggestTimer);
      this.topicSuggestTimer = null;
    }
    void this.endTopicSuggest();
  }

  private async endTopicSuggest(): Promise<void> {
    this.topicSuggestTimer = null;
    const { settings } = this.state;
    const apiKey = settings.aiApiKey ?? "";

    this.state = { ...this.state, isGeneratingQuestions: true };
    this.broadcastState();

    try {
      const suggestionsText = this.suggestionsList.map((s) => s.text).join("\n");
      const topicsResult = await generateTopics(apiKey, {
        suggestions: suggestionsText,
        topicCount: settings.topicCount,
      });

      this.state = { ...this.state, selectedTopics: topicsResult };
      this.broadcastState();

      const topics = await generateQuestions(apiKey, {
        topics: topicsResult.map((t) => t.name),
        questionsPerTopic: settings.questionsPerTopic,
      });

      let questionTable = topics.map((t) => t.questions);
      const topicNames = topics.map((t) => t.name);
      questionTable = balanceQuestions(questionTable, settings.teamCount);

      this.state = {
        ...this.state,
        isGeneratingQuestions: false,
        questionsReady: true,
        questionTable,
        topicNames,
        activeTeamId: this.pickFirstTeam(),
      };
      this.broadcastState();
    } catch (err) {
      console.error("AI generation failed:", err);
      this.state = { ...this.state, phase: "question-setup", isGeneratingQuestions: false };
      this.broadcastState();
    }
  }

  private proceedFromSetup(): void {
    const activeTeamId = this.state.activeTeamId ?? this.pickFirstTeam();
    if (this.state.settings.gameMode === "blitz") {
      this.startBlitzCaptain(activeTeamId);
    } else {
      this.startRoundCaptain(activeTeamId);
    }
  }

  // ── Round phases ──────────────────────────────────────────────────────────────

  private startRoundCaptain(activeTeamId: string): void {
    const lastCaptainId = this.state.lastCaptainByTeam[activeTeamId];
    const teamPlayers = this.state.players.filter(
      (p) => p.teamId === activeTeamId && p.role === "player",
    );
    // If all team players were recent captains, reset the flag (single-player case)
    const allWereRecent = teamPlayers.length > 0 && teamPlayers.every((p) => p.id === lastCaptainId);
    this.readySet.clear();
    this.state = {
      ...this.state,
      phase: "round-captain",
      activeTeamId,
      captainId: null,
      allAnswers: {},
      currentQuestion: undefined,
      questionRevealText: undefined,
      roundResult: undefined,
      timer: undefined,
      isAutoReviewing: false,
      players: this.state.players.map((p) => ({
        ...p,
        hasAnswered: false,
        isReady: false,
        wasRecentCaptain: allWereRecent
          ? false
          : p.teamId === activeTeamId
            ? p.id === lastCaptainId
            : p.wasRecentCaptain,
      })),
      jokerActivatedThisRound: {},
    };
    this.broadcastState();
  }

  private startRoundReady(): void {
    this.readySet.clear();
    this.state = {
      ...this.state,
      phase: "round-ready",
      players: this.state.players.map((p) => ({ ...p, isReady: false })),
    };
    this.broadcastState();
  }

  private checkRoundReady(): void {
    if (this.state.phase !== "round-ready") return;
    const teamPlayers = this.activeTeamPlayers();
    if (teamPlayers.length === 0) {
      this.startRoundActive(this.state.pickedTopicIdx!, this.state.pickedQuestionIdx!);
      return;
    }
    if (teamPlayers.every((p) => this.readySet.has(p.id))) {
      this.startRoundActive(this.state.pickedTopicIdx!, this.state.pickedQuestionIdx!);
    }
  }

  private startRoundPick(): void {
    this.state = { ...this.state, phase: "round-pick" };
    this.broadcastState();
  }

  private startRoundActive(topicIdx: number, questionIdx: number): void {
    const question = this.state.questionTable[topicIdx][questionIdx];
    const duration = this.state.settings.roundDuration * 1000;
    const endsAt = Date.now() + duration;

    this.state = {
      ...this.state,
      phase: "round-active",
      currentQuestion: question,
      currentRound: {
        topicName: this.state.topicNames[topicIdx] ?? `Тема ${topicIdx + 1}`,
        difficulty: question.difficulty,
        questionId: question.id,
      },
      usedQuestionIds: [...this.state.usedQuestionIds, question.id],
      allAnswers: {},
      timer: { endsAt },
      players: this.state.players.map((p) => ({ ...p, hasAnswered: false })),
    };
    this.broadcastState();

    this.roundTimer = setTimeout(() => {
      this.startRoundAnswer();
    }, duration);
  }

  private startRoundAnswer(): void {
    this.clearRoundTimer();
    const duration = this.state.settings.answerDuration * 1000;
    const endsAt = Date.now() + duration;
    this.state = {
      ...this.state,
      phase: "round-answer",
      timer: { endsAt },
    };
    this.broadcastState();

    this.answerTimer = setTimeout(() => {
      this.finalizeAnswerPhase();
    }, duration);
  }

  private checkAllAnswered(): void {
    if (this.state.phase !== "round-active" && this.state.phase !== "round-answer") return;
    const teamPlayers = this.activeTeamPlayers();
    if (teamPlayers.length === 0) return;
    if (teamPlayers.every((p) => p.hasAnswered)) {
      if (this.state.phase === "round-active") {
        this.clearRoundTimer();
      } else {
        this.clearAnswerTimer();
      }
      this.finalizeAnswerPhase();
    }
  }

  private finalizeAnswerPhase(): void {
    this.clearAnswerTimer();
    if (this.state.settings.hostType === "ai") {
      void this.autoReview();
    } else {
      this.state = { ...this.state, phase: "round-review", timer: undefined };
      this.broadcastState();
    }
  }

  private async autoReview(): Promise<void> {
    this.state = { ...this.state, phase: "round-review", isAutoReviewing: true, timer: undefined };
    this.broadcastState();

    const q = this.state.currentQuestion;
    const apiKey = this.state.settings.aiApiKey ?? "";

    const teamPlayers = this.activeTeamPlayers();
    const playerAnswerPairs = teamPlayers.map((p) => ({
      playerId: p.id,
      answer: this.state.allAnswers[p.id] ?? "",
    }));
    const playerAnswers = playerAnswerPairs.map((p) => p.answer);

    try {
      const result = await checkAnswers(apiKey, {
        questionText: q?.text ?? "",
        playerAnswers,
      });

      const groups: AnswerGroup[] = result.groups.map((g) => ({
        ...g,
        playerIds: g.playerIds.map((label) => {
          const match = /^Игрок\s+(\d+)$/.exec(label);
          if (match) {
            const idx = parseInt(match[1]) - 1;
            return playerAnswerPairs[idx]?.playerId ?? label;
          }
          return label;
        }),
      }));

      this.state = { ...this.state, isAutoReviewing: false };
      this.finalizeRound(groups, result.commentary);
    } catch (err) {
      console.error("AI review failed:", err);
      this.state = { ...this.state, isAutoReviewing: false, phase: "round-review" };
      this.broadcastState();
    }
  }

  private finalizeRound(groups: AnswerGroup[], commentary?: string): void {
    const q = this.state.currentQuestion;
    const activeTeam = this.state.activeTeamId!;
    const jokerApplied = this.state.jokerActivatedThisRound[activeTeam] ?? false;
    const score = calculateRoundScore(q?.difficulty ?? 0, groups, jokerApplied);

    const jokerUsed = { ...this.state.jokerUsed };
    if (jokerApplied) jokerUsed[activeTeam] = true;

    const scores = { ...this.state.scores };
    scores[activeTeam] = (scores[activeTeam] ?? 0) + score;

    const acceptedAnswerCountByPlayer = { ...this.state.acceptedAnswerCountByPlayer };
    for (const g of groups) {
      if (g.accepted) {
        for (const pid of g.playerIds) {
          acceptedAnswerCountByPlayer[pid] = (acceptedAnswerCountByPlayer[pid] ?? 0) + 1;
        }
      }
    }

    const lastCaptainByTeam = { ...this.state.lastCaptainByTeam };
    if (this.state.captainId) {
      lastCaptainByTeam[activeTeam] = this.state.captainId;
    }

    const roundResult = {
      questionText: q?.text ?? "",
      groups,
      score,
      jokerApplied,
      commentary,
    };

    const questionHistory = [
      ...(this.state.questionHistory ?? []),
      { questionId: q?.id ?? "", teamId: activeTeam, score },
    ];

    this.state = {
      ...this.state,
      phase: "round-result",
      scores,
      jokerUsed,
      jokerActivatedThisRound: {},
      roundResult,
      lastCaptainByTeam,
      acceptedAnswerCountByPlayer,
      questionHistory,
      timer: undefined,
      isAutoReviewing: false,
    };
    this.broadcastState();
  }

  private goToNextRound(): void {
    // Check remaining questions
    const allQuestionIds = this.state.questionTable.flat().map((q) => q.id);
    const remaining = allQuestionIds.filter(
      (id) => !this.state.usedQuestionIds.includes(id),
    );

    if (remaining.length > 0) {
      const nextTeam = this.getNextTeam();
      this.startRoundCaptain(nextTeam);
      return;
    }

    // Check for blitz tasks
    const blitzRemaining = this.state.blitzTasks.filter(
      (t) => !this.state.usedBlitzTaskIds.includes(t.id),
    );

    if (blitzRemaining.length > 0) {
      this.startBlitzCaptain(this.getNextTeam());
      return;
    }

    // Finale
    this.startFinale();
  }

  private getNextTeam(): string {
    const { teamCount } = this.state.settings;
    if (teamCount === 1) return "red";
    const current = this.state.activeTeamId;
    return current === "red" ? "blue" : "red";
  }

  // ── Blitz phases ──────────────────────────────────────────────────────────────

  private startBlitzCaptain(forceTeamId?: string): void {
    const activeTeamId = forceTeamId ?? this.state.activeTeamId ?? this.pickFirstTeam();
    const lastCaptainId = this.state.lastCaptainByTeam[activeTeamId];
    const teamPlayersB = this.state.players.filter(
      (p) => p.teamId === activeTeamId && p.role === "player",
    );
    const allWereRecentB =
      teamPlayersB.length > 0 && teamPlayersB.every((p) => p.id === lastCaptainId);
    this.readySet.clear();
    this.state = {
      ...this.state,
      phase: "blitz-captain",
      activeTeamId,
      captainId: null,
      blitzAnswers: {},
      currentBlitzItem: undefined,
      pickedBlitzTaskId: undefined,
      blitzTaskReveal: undefined,
      roundResult: undefined,
      timer: undefined,
      players: this.state.players.map((p) => ({
        ...p,
        hasAnswered: false,
        isReady: false,
        blitzOrder: undefined,
        wasRecentCaptain: allWereRecentB
          ? false
          : p.teamId === activeTeamId
            ? p.id === lastCaptainId
            : p.wasRecentCaptain,
      })),
    };
    this.broadcastState();
  }

  private checkBlitzCaptainReady(): void {
    if (this.state.phase !== "blitz-captain") return;
    if (!this.state.captainId) return;
    const activeTeamId = this.state.activeTeamId!;
    const nonCaptainTeamPlayers = this.state.players.filter(
      (p) => p.teamId === activeTeamId && p.role === "player" && p.id !== this.state.captainId,
    );
    if (nonCaptainTeamPlayers.length === 0 || nonCaptainTeamPlayers.every((p) => (p.blitzOrder ?? 0) > 0)) {
      const ordered = [...nonCaptainTeamPlayers]
        .filter((p) => (p.blitzOrder ?? 0) > 0)
        .sort((a, b) => (a.blitzOrder ?? 0) - (b.blitzOrder ?? 0))
        .map((p) => p.id);
      this.state = { ...this.state, blitzOrder: ordered };
      this.broadcastState();
      this.startBlitzPick();
    }
  }

  private startBlitzReadyForBlitz(taskId: string, item: BlitzItem): void {
    this.readySet.clear();
    this.state = {
      ...this.state,
      phase: "blitz-ready",
      currentBlitzItem: item,
      pickedBlitzTaskId: taskId,
      usedBlitzTaskIds: [...this.state.usedBlitzTaskIds, taskId],
      players: this.state.players.map((p) => ({ ...p, isReady: false })),
    };
    this.broadcastState();
  }

  private checkBlitzReadyForActive(): void {
    if (this.state.phase !== "blitz-ready") return;
    const teamPlayers = this.activeTeamPlayers();
    if (teamPlayers.length === 0) {
      this.startBlitzActiveFromReady();
      return;
    }
    if (teamPlayers.every((p) => this.readySet.has(p.id))) {
      this.startBlitzActiveFromReady();
    }
  }

  private startBlitzActiveFromReady(): void {
    const taskId = this.state.pickedBlitzTaskId!;
    const item = this.state.currentBlitzItem!;
    if (!item) return;
    this.startBlitzActive(taskId, item);
  }

  private startBlitzPick(): void {
    const unused = this.state.blitzTasks.filter(
      (t) => !this.state.usedBlitzTaskIds.includes(t.id),
    );
    const picked = unused[Math.floor(Math.random() * unused.length)];
    this.state = {
      ...this.state,
      phase: "blitz-pick",
      pickedBlitzTaskId: picked?.id,
    };
    this.broadcastState();
  }

  private startBlitzActive(taskId: string, item: BlitzItem): void {
    const teamSize = this.activeTeamPlayers().length;
    const totalTimeMs = Math.max(1, teamSize - 1) * 30_000;
    const endsAt = Date.now() + totalTimeMs;
    const startedAt = Date.now();

    this.state = {
      ...this.state,
      phase: "blitz-active",
      currentBlitzItem: item,
      // Task is already in usedBlitzTaskIds from startBlitzReadyForBlitz; avoid duplicates
      usedBlitzTaskIds: this.state.usedBlitzTaskIds.includes(taskId)
        ? this.state.usedBlitzTaskIds
        : [...this.state.usedBlitzTaskIds, taskId],
      blitzAnswers: {},
      blitzStartedAt: startedAt,
      blitzTotalTimeMs: totalTimeMs,
      timer: { endsAt },
      players: this.state.players.map((p) => ({ ...p, hasAnswered: false })),
    };
    this.broadcastState();

    this.blitzTimer = setTimeout(() => {
      this.startBlitzAnswer();
    }, totalTimeMs);
  }

  private startBlitzAnswer(): void {
    this.clearBlitzTimer();
    const endsAt = Date.now() + 20_000;
    this.state = {
      ...this.state,
      phase: "blitz-answer",
      timer: { endsAt },
    };
    this.broadcastState();

    this.blitzTimer = setTimeout(() => {
      void this.finalizeBlitz();
    }, 20_000);
  }

  private checkAllBlitzAnswered(): void {
    const teamPlayers = this.activeTeamPlayers().filter(
      (p) => p.id !== this.state.captainId,
    );
    if (teamPlayers.length === 0) {
      this.clearTimers();
      void this.finalizeBlitz();
      return;
    }
    const allAnswered = teamPlayers.every((p) => p.hasAnswered);
    if (allAnswered) {
      this.clearTimers();
      void this.finalizeBlitz();
    }
  }

  private async finalizeBlitz(): Promise<void> {
    this.clearTimers();
    const item = this.state.currentBlitzItem;
    if (!item) return;

    const blitzOrder = this.state.blitzOrder ?? [];
    const answers = this.state.blitzAnswers ?? {};
    const chainLength = computeChainLength(blitzOrder, answers, item.text);

    const totalTimeMs = this.state.blitzTotalTimeMs ?? 1;
    const startedAt = this.state.blitzStartedAt ?? Date.now();
    const now = Date.now();
    const elapsed = now - startedAt;
    const timeLeftMs = Math.max(0, totalTimeMs - elapsed);

    // All answered early means the phase ended before the timer (blitz-active), not blitz-answer
    const teamPlayers = this.activeTeamPlayers().filter(
      (p) => p.id !== this.state.captainId,
    );
    const allAnsweredEarly =
      this.state.phase !== "blitz-answer" && teamPlayers.every((p) => p.hasAnswered);

    const score = computeBlitzScore(
      chainLength,
      item.difficulty,
      allAnsweredEarly,
      timeLeftMs,
      totalTimeMs,
    );
    const activeTeam = this.state.activeTeamId!;
    const scores = { ...this.state.scores };
    scores[activeTeam] = (scores[activeTeam] ?? 0) + score;

    const acceptedAnswerCountByPlayer = { ...this.state.acceptedAnswerCountByPlayer };
    if (chainLength > 0) {
      for (let i = 0; i < chainLength && i < blitzOrder.length; i++) {
        const pid = blitzOrder[i];
        acceptedAnswerCountByPlayer[pid] = (acceptedAnswerCountByPlayer[pid] ?? 0) + 1;
      }
    }

    const lastCaptainByTeam = { ...this.state.lastCaptainByTeam };
    if (this.state.captainId) lastCaptainByTeam[activeTeam] = this.state.captainId;

    const groups: AnswerGroup[] = blitzOrder.map((pid, idx) => {
      const answerVal = answers[pid] ?? "";
      const inChain = idx < chainLength;
      return {
        id: `bg_${idx}`,
        accepted: inChain,
        canonicalAnswer: answerVal || "—",
        playerIds: [pid],
        note: inChain ? null : answerVal ? "Неверный ответ" : "Нет ответа",
      };
    });

    this.state = {
      ...this.state,
      phase: "blitz-result",
      scores,
      lastCaptainByTeam,
      acceptedAnswerCountByPlayer,
      timer: undefined,
      roundResult: {
        questionText: item.text,
        groups,
        score,
        jokerApplied: false,
      },
    };
    this.broadcastState();
  }

  // ── Finale ────────────────────────────────────────────────────────────────────

  private startFinale(): void {
    this.state = {
      ...this.state,
      phase: "finale",
      timer: undefined,
      captainId: null,
    };
    this.broadcastState();
  }

  private doRestart(): void {
    const { settings, scores } = this.state;
    const newScores: Record<string, number> = {};
    for (const k of Object.keys(scores)) newScores[k] = 0;
    const jokerUsed: Record<string, boolean> = {};
    for (const k of Object.keys(scores)) jokerUsed[k] = false;

    this.readySet.clear();
    this.suggestionsList = [];
    this.noIdeasSet.clear();
    this.suggestCounts.clear();
    this.clearTimers();

    this.state = {
      phase: "lobby",
      activeTeamId: null,
      scores: newScores,
      players: this.state.players.map((p) => ({
        ...p,
        hasAnswered: false,
        isReady: false,
        wasRecentCaptain: false,
        blitzOrder: undefined,
      })),
      jokerUsed,
      jokerActivatedThisRound: {},
      serverNow: Date.now(),
      questionTable: [],
      topicNames: [],
      allAnswers: {},
      usedQuestionIds: [],
      currentQuestion: undefined,
      settings,
      blitzTasks: [],
      usedBlitzTaskIds: [],
      currentBlitzItem: undefined,
      pickedBlitzTaskId: undefined,
      blitzAnswers: undefined,
      lastCaptainByTeam: {},
      captainCountByPlayer: {},
      acceptedAnswerCountByPlayer: {},
      captainId: null,
      questionHistory: [],
      questionsReady: undefined,
    };
    this.broadcastState();
  }

  // ── Timer helpers ─────────────────────────────────────────────────────────────

  private clearRoundTimer(): void {
    if (this.roundTimer !== null) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }

  private clearAnswerTimer(): void {
    if (this.answerTimer !== null) {
      clearTimeout(this.answerTimer);
      this.answerTimer = null;
    }
  }

  private clearBlitzTimer(): void {
    if (this.blitzTimer !== null) {
      clearTimeout(this.blitzTimer);
      this.blitzTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearRoundTimer();
    this.clearAnswerTimer();
    this.clearBlitzTimer();
    if (this.topicSuggestTimer !== null) {
      clearTimeout(this.topicSuggestTimer);
      this.topicSuggestTimer = null;
    }
  }

  private pickFirstTeam(): string {
    const ids = Object.keys(this.state.scores);
    return ids[Math.floor(Math.random() * ids.length)];
  }
}
