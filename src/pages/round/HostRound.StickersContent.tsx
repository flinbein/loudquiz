import { useMemo } from "react";
import {
  usePhase,
  useCurrentRound,
  usePlayers,
  useCurrentQuestion,
} from "@/store/selectors";
import { evaluateGroup, mergeAnswerGroups, splitAnswerFromGroup, } from "@/store/actions/round";
import { StickerStack } from "@/components/StickerStack/StickerStack";
import type { RoundPhase } from "@/types/game";
import styles from "./HostRound.module.css";

export function StickersContent(){
  const phase = usePhase() as RoundPhase;
  const round = useCurrentRound();
  const players = usePlayers();
  const question = useCurrentQuestion();
  const review = round?.reviewResult;
  const groups = review?.groups ?? [];
  
  // Filter out empty-answer groups (they're auto-marked wrong)
  const nonEmptyGroups = groups.filter((group) =>
    group.some((name) => round?.answers[name]?.text !== ""),
  );
  
  const showAnswers = phase === "round-review" || phase === "round-result";
  const canEvaluate = phase === "round-review" && review?.aiStatus !== "loading"
  
  const answerStickers = useMemo(() => {
    return Object.entries(round?.answers ?? {})
    .map(([name, answer]) => ({name, answer} as const))
    .filter(({answer}) => answer)
    .sort((a, b) => a.answer.timestamp - b.answer.timestamp)
    .map(({name, answer}) => ({
      name, answer, player: players.find((player) => player.name === name),
    }))
  }, [round?.answers, players]);
  
  if (showAnswers) return (
    <div className={styles.stickersGrid}>
      {nonEmptyGroups.map((group) => {
        const representativePlayer = group[0]!;
        const stickers = group.map((playerName) => {
          const player = players.find((p) => p.name === playerName);
          const answer = round?.answers[playerName];
          const eval_ = review?.evaluations.find(
            (e) => e.playerName === playerName,
          );
          const correct = eval_?.correct;
          const stickerStamp =
            correct === true ? `+${question?.difficulty}` : correct === false ? "✗" : undefined;
          const stickerStampColor: "green" | "red" =
            correct === false ? "red" : "green";
          return {
            player: player,
            answerText: answer?.text ?? "",
            aiComment: eval_?.aiComment,
            hidden: showAnswers,
            stampText: stickerStamp,
            stampColor: stickerStampColor,
          };
        });
        
        return (
          <div key={group.join("\0")} className={styles.stickerSlot}>
            <StickerStack
              stickers={stickers}
              draggable={canEvaluate}
              dragData={(phase === "round-review") ? representativePlayer : undefined}
              onDrop={(phase === "round-review") ? (dragData) => {
                mergeAnswerGroups(dragData, representativePlayer);
              } : undefined}
              onClickSticker={canEvaluate ? () => evaluateGroup(group) : undefined}
              onClickBadge={canEvaluate ? () => {
                // Split last player from group
                const lastPlayer = group[group.length - 1]!;
                splitAnswerFromGroup(lastPlayer);
              } : undefined}
            />
          </div>
        );
      })}
    </div>
  );
  
  return (
    <div className={styles.stickersGrid}>
      {answerStickers.map(({answer, player, name}) => {
        return (
          <div key={name} className={styles.stickerSlot}>
            <StickerStack stickers={[{
              player: player,
              answerHidden: true,
              answerText: answer?.text ?? "",
            }]} />
          </div>
        
        )
      })}
    </div>
  );
}