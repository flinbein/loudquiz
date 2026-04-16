import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePhase, useTopicsSuggest } from "@/store/selectors";
import { TopicsBoardBlock } from "@/pages/blocks/TopicsBoardBlock";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";
import { AiErrorBanner } from "@/components/AiErrorBanner/AiErrorBanner";
import {
  hostStartManualTopics,
  hostCancelManualTopics,
  hostSubmitManualTopics,
  retryAiStep,
  fallbackToManualTopics,
} from "@/store/actions/topicsSuggest";
import styles from "./HostTopicsSuggest.module.css";
import { SidebarBlock } from "@/pages/blocks/SidebarBlock";
import { HostLayout } from "@/pages/blocks/HostLayout";
import { HostMainContainer } from "@/pages/blocks/HostMainContainer";

export function HostTopicsSuggest() {
  const phase = usePhase();
  const ts = useTopicsSuggest();
  const { t } = useTranslation();
  const generationStep = ts?.generationStep ?? "topics";
  console.log("=== phase", phase)
  
  return (
    <HostLayout>
      <HostMainContainer>
        {(phase === "topics-collecting" || phase === "topics-generating") && (
          <TopicsBoardBlock />
        )}
        {phase === "topics-collecting" && (
          <ManualTopicsSuggest />
        )}
        {phase === "topics-generating" && (
          <div className={styles.loader}>{t(`topics.generating.${generationStep}`)}</div>
        )}
        {phase === "topics-generating" && ts?.aiError && (
          <AiErrorBanner
            message={`${t(`topics.errors.${ts.aiError.step}`)}: ${ts.aiError.message}`}
            canFallback={ts.aiError.step === "topics"}
            onRetry={retryAiStep}
            onFallback={
              ts.aiError.step === "topics" ? fallbackToManualTopics : undefined
            }
            retryLabel={t("topics.errors.retry")}
            fallbackLabel={t("topics.errors.fallback")}
          />
        )}
        {phase ==="topics-preview" && (
          <TaskBoardBlock />
        )}
      </HostMainContainer>
      <SidebarBlock />
    </HostLayout>
  )
}

function ManualTopicsSuggest() {
  const ts = useTopicsSuggest();
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [manualList, setManualList] = useState<string[]>([]);
  const manualMode = ts?.manualTopics != null;
  
  return (
    <div className={styles.actions}>
      {!manualMode ? (
        <button
          onClick={() => {
            setManualList([]);
            hostStartManualTopics();
          }}
        >
          {t("topics.host.enterManually")}
        </button>
      ) : (
        <div className={styles.manualForm}>
          <div className={styles.manualList}>
            {manualList.map((text, i) => (
              <div key={i} className={styles.manualItem}>
                <span>{text}</span>
                <button
                  onClick={() =>
                    setManualList((prev) =>
                      prev.filter((_, j) => j !== i),
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className={styles.manualInput}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("topics.host.manualPlaceholder")}
            />
            <button
              disabled={!draft.trim()}
              onClick={() => {
                setManualList((p) => [...p, draft.trim()]);
                setDraft("");
              }}
            >
              +
            </button>
          </div>
          <div className={styles.manualButtons}>
            <button onClick={() => hostCancelManualTopics()}>
              {t("common.cancel")}
            </button>
            <button
              disabled={manualList.length === 0}
              onClick={() => hostSubmitManualTopics(manualList)}
            >
              {t("topics.host.submitManual")}
            </button>
          </div>
        </div>
      )}
    </div>
  
  )
}