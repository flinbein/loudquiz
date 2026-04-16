import { useCurrentRound, usePlayers } from "@/store/selectors";
import { Sticker } from "@/components/Sticker/Sticker";

export function BlitzStickerBlock(){
  const round = useCurrentRound();
  const players = usePlayers();
  if (!round) return;
  const review = round.reviewResult;
  const evaluation = review?.evaluations[0];
  const answer = evaluation?.playerName ? round.answers[evaluation.playerName] : undefined;
  if (!answer) return null;
  const player = players.find(p => p.name === evaluation?.playerName);
  if (!player) return null;
  return (
    <Sticker
      answerText={answer.text}
      player={player}
      stampColor={evaluation?.correct ? "green" : "red"}
      stampText={evaluation?.correct ? `+${review?.score ?? 0}` : "×"}
    />
  )
}