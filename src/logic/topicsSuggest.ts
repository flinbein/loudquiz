export function shouldAutoAdvance(
  onlinePlayerNames: string[],
  suggestions: Record<string, string[]>,
  noIdeas: string[],
  topicCount: number,
): boolean {
  if (onlinePlayerNames.length === 0) return false;
  return onlinePlayerNames.every((name) => {
    if (noIdeas.includes(name)) return true;
    const mine = suggestions[name] ?? [];
    return mine.length >= topicCount;
  });
}
