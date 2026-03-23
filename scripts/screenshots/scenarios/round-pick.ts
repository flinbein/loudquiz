/**
 * Скриншоты для фазы round-pick:
 * Для ведущего, для игрока, для игрока-капитана
 * По 3 варианта каждый:
 *   - джокер не активирован
 *   - джокер активирован на этот раунд
 *   - джокер был активирован ранее
 *
 * История: q2 (красные), q6 (синие), q11 (красные, 100%), q12 (синие, джокер).
 */
import type { ScreenshotScenario } from "../types";
import {
  makeFullState,
  makePublicState,
  makeTwoTeamPlayers,
  makeDefaultSettings,
  makePublicQuestionTable,
  makeQuestionHistory,
  USED_QUESTION_IDS,
  HISTORY_SCORES,
  HISTORY_JOKER_USED,
  HISTORY_JOKER_THIS_ROUND,
} from "../stateFactory";

const players = makeTwoTeamPlayers(5);
const captain = players[0];
const questionTable = makePublicQuestionTable(USED_QUESTION_IDS);
const questionHistory = makeQuestionHistory();

function jokerState(variant: "none" | "active" | "used") {
  return {
    jokerUsed: {
      red: variant === "used" || HISTORY_JOKER_USED.red,
      blue: HISTORY_JOKER_USED.blue,
    },
    jokerActivatedThisRound: {
      red: variant === "active",
      blue: HISTORY_JOKER_THIS_ROUND.blue,
    },
  };
}

const baseOverrides = {
  players,
  activeTeamId: "red" as const,
  captainId: captain.id,
  publicQuestionTable: questionTable,
  questionHistory,
  scores: HISTORY_SCORES,
};

const JOKER_VARIANTS = [
  { suffix: "no-joker", variant: "none" as const },
  { suffix: "joker-active", variant: "active" as const },
  { suffix: "joker-used", variant: "used" as const },
];

export const roundPickScenarios: ScreenshotScenario[] = JOKER_VARIANTS.flatMap(
  ({ suffix, variant }) => [
    {
      name: `round-pick_${suffix}_host`,
      view: "host" as const,
      mockHost: {
        gameState: makeFullState("round-pick", {
          ...baseOverrides,
          ...jokerState(variant),
        }),
        settings: makeDefaultSettings(),
      },
    },
    {
      name: `round-pick_${suffix}_player`,
      view: "player" as const,
      mockPlayer: {
        gameState: makePublicState("round-pick", {
          ...baseOverrides,
          ...jokerState(variant),
        }),
        playerName: players[1].name,
        localRole: "player" as const,
      },
    },
    {
      name: `round-pick_${suffix}_captain_player`,
      view: "player" as const,
      mockPlayer: {
        gameState: makePublicState("round-pick", {
          ...baseOverrides,
          ...jokerState(variant),
        }),
        playerName: captain.name,
        localRole: "player" as const,
      },
    },
  ],
);
