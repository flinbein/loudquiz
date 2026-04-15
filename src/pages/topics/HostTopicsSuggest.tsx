import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePhase, useTopicsSuggest } from "@/store/selectors";
import { TopicsSidebarBlock } from "@/pages/blocks/TopicsSidebarBlock";
import { TopicsBoardBlock } from "@/pages/blocks/TopicsBoardBlock";
import { TaskBoardBlock } from "@/pages/blocks/TaskBoardBlock";
import { AiErrorBanner } from "@/components/AiErrorBanner/AiErrorBanner";
import {
  hostStartManualTopics,
  hostCancelManualTopics,
  hostSubmitManualTopics,
  startFirstRound,
  retryAiStep,
  fallbackToManualTopics,
} from "@/store/actions/topicsSuggest";
import styles from "./HostTopicsSuggest.module.css";

export function HostTopicsSuggest() {
  const phase = usePhase();
  const ts = useTopicsSuggest();
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const [manualList, setManualList] = useState<string[]>([]);

  if (phase === "topics-collecting") {
    const manualMode = ts?.manualTopics != null;
    return (
      <div className={styles.layout}>
        <TopicsSidebarBlock />
        <div className={styles.main}>
          <TopicsBoardBlock />
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
        </div>
      </div>
    );
  }

  if (phase === "topics-generating") {
    const step = ts?.generationStep ?? "topics";
    return (
      <div className={styles.layout}>
        <TopicsSidebarBlock />
        <div className={styles.mainCentered}>
          {ts?.aiError ? (
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
          ) : (
            <div className={styles.loader}>{t(`topics.generating.${step}`)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <TopicsSidebarBlock />
      <div className={styles.main}>
        <TaskBoardBlock />
        <button
          className={styles.primaryBtn}
          onClick={() => startFirstRound("random")}
        >
          {t("topics.preview.startRound")}
        </button>
      </div>
    </div>
  );
}
