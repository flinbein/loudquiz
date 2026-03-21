import type { Question, AnswerGroup } from "./types";

export function normalizeAnswer(s: string): string {
  return s.toLowerCase().replace(/ё/g, "е").trim();
}

export function computeChainLength(
  orderedPlayerIds: string[],
  answers: Record<string, string>,
  correctText: string,
): number {
  const normalized = normalizeAnswer(correctText);
  let chain = 0;
  for (const pid of orderedPlayerIds) {
    const ans = answers[pid];
    if (ans !== undefined && normalizeAnswer(ans) === normalized) {
      chain++;
    } else {
      break;
    }
  }
  return chain;
}

export function computeBlitzScore(
  chainLength: number,
  taskCost: number,
  allAnswered: boolean,
  timeLeftMs: number,
  totalTimeMs: number,
): number {
  if (chainLength === 0) return 0;
  const base = chainLength * taskCost;
  if (allAnswered && totalTimeMs > 0) {
    return Math.round(base * (1 + timeLeftMs / totalTimeMs));
  }
  return base;
}

export function calculateRoundScore(
  difficulty: number,
  acceptedGroups: AnswerGroup[],
  jokerApplied: boolean,
): number {
  const accepted = acceptedGroups.filter((g) => g.accepted).length;
  const base = difficulty * accepted;
  return jokerApplied && base > 0 ? base * 2 : base;
}

export function balanceQuestions(table: Question[][], teamCount: 1 | 2): Question[][] {
  if (teamCount === 1) return table;
  const total = table.reduce((s, t) => s + t.length, 0);
  if (total % 2 === 0) return table;
  // Remove last question of last non-empty topic to make total even
  const result = table.map((t) => [...t]);
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].length > 0) {
      result[i].pop();
      break;
    }
  }
  return result;
}

export function computeGameStats(
  captainCountByPlayer: Record<string, number>,
  acceptedAnswerCountByPlayer: Record<string, number>,
  playerNameById: Record<string, string>,
) {
  let topAnswererName: string | undefined;
  let topAnswererCount = 0;
  let topCaptainName: string | undefined;
  let topCaptainCount = 0;

  for (const [id, count] of Object.entries(acceptedAnswerCountByPlayer)) {
    if (count > topAnswererCount) {
      topAnswererCount = count;
      topAnswererName = playerNameById[id];
    }
  }
  for (const [id, count] of Object.entries(captainCountByPlayer)) {
    if (count > topCaptainCount) {
      topCaptainCount = count;
      topCaptainName = playerNameById[id];
    }
  }

  return {
    topAnswererName,
    topAnswererCount: topAnswererCount > 0 ? topAnswererCount : undefined,
    topCaptainName,
    topCaptainCount: topCaptainCount > 0 ? topCaptainCount : undefined,
  };
}
