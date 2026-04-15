import { useTranslation } from "react-i18next";
import { usePhase, useCurrentRound, useTeams, useCurrentQuestion, useSettings } from "@/store/selectors";
import { activateJoker } from "@/store/actions/round";
import { retryAiReview, fallbackReviewToManual } from "@/store/actions/aiReview";
import { JokerState } from "@/components/JokerState/JokerState";
import { ScoreFormula } from "@/components/ScoreFormula/ScoreFormula";
import { AiErrorBanner } from "@/components/AiErrorBanner/AiErrorBanner";
import { AiCommentBubble } from "@/components/AiCommentBubble/AiCommentBubble";
import { StickersContent } from "./HostRound.StickersContent";
import { TaskCardBlock } from "../blocks/TaskCardBlock";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";
import { HostMainContainer } from "@/pages/blocks/HostMainContainer";
import styles from "./HostRound.module.css";

export function MainContent(){
  // Main area content by phase
  const phase = usePhase();
  
  return (
    <HostMainContainer>
      {(phase === "round-captain" || phase === "round-pick") ? (
        <DisplaySelectTask />
      ) : (
        <DisplayRoundPlay />
      )}
    </HostMainContainer>
  );
}

function DisplaySelectTask(){
  const round = useCurrentRound();
  const teams = useTeams();
  
  const jokerTeam = teams.find((t) => t.id === round?.teamId);
  const jokerState = jokerTeam?.jokerUsed
    ? "disabled"
    : round?.jokerActive ? "active" : "enabled";
  
  return (
    <>
      <TaskBoardBlock hostSelect />
      <JokerState state={jokerState} onClick={activateJoker} />
    </>
  );
}

function DisplayRoundPlay(){
  const round = useCurrentRound();
  const phase = usePhase();
  const review = round?.reviewResult;
  const question = useCurrentQuestion();
  const settings = useSettings();
  
  const correctCount = review?.groups.filter((group) => {
    const eval_ = review?.evaluations.find((e) => e.playerName === group[0]);
    return eval_?.correct === true;
  }).length ?? 0;
  const totalScore = review?.score ?? 0;
  
  return (
    <>
      <TaskCardBlock />
      <StickersContent/>
      {settings.mode === "ai" && (
        <AIControl/>
      )}
      {phase === "round-result" && (
        <ScoreFormula
          difficulty={question?.difficulty ?? 0}
          correctCount={correctCount}
          jokerActive={round?.jokerActive ?? false}
          bonusTimeMultiplier={review?.bonusTimeMultiplier ?? 0}
          bonusTimeApplied={review?.bonusTimeApplied ?? false}
          totalScore={totalScore}
        />
      )}
      
    </>
  )
}

function AIControl(){
  const round = useCurrentRound();
  const review = round?.reviewResult;
  const phase = usePhase();
  const { t } = useTranslation();
  
  if (review?.aiStatus === "loading") return (
    <div className={styles.aiCenter}>{t("round.aiReview.loading")}</div>
  );
  
  if (review?.aiStatus === "error") return (
    <div className={styles.aiCenter}>
      <AiErrorBanner
        message={`${t("round.aiReview.errorPrefix")}: ${review.aiError ?? ""}`}
        canFallback
        onRetry={retryAiReview}
        onFallback={fallbackReviewToManual}
        retryLabel={t("topics.errors.retry")}
        fallbackLabel={t("round.aiReview.fallback")}
      />
    </div>
  );
  
  
  if (phase === "round-result" && review?.comment) {
    return <AiCommentBubble text={review.comment} />;
  }
  
  return null;
}