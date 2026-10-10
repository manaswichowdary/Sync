export function recommendationCount(recommenderIds: string[]): number {
  return new Set(recommenderIds.filter(Boolean)).size;
}

export function badgeLabels(input: {
  invitedByFirstName: string | null;
  helpedNeighbors: boolean;
  recommendedBy: number;
}): string[] {
  const labels: string[] = [];
  if (input.invitedByFirstName) labels.push(`Invited by ${input.invitedByFirstName}`);
  if (input.helpedNeighbors) labels.push("Helped neighbors");
  if (input.recommendedBy > 0) labels.push(`Recommended by ${input.recommendedBy} neighbors`);
  return labels;
}

export function helpCounts(
  exchanges: { helperId: string; requesterId: string; completed: boolean }[],
  userId: string
): { given: number; received: number } {
  let given = 0;
  let received = 0;
  for (const exchange of exchanges) {
    if (!exchange.completed) continue;
    if (exchange.helperId === userId) given += 1;
    if (exchange.requesterId === userId) received += 1;
  }
  return { given, received };
}

export function helpGivenThisMonth(completedAt: (string | null)[], now: Date): number {
  const year = now.getFullYear();
  const month = now.getMonth();
  return completedAt.filter((iso) => {
    if (!iso) return false;
    const date = new Date(iso);
    return date.getFullYear() === year && date.getMonth() === month;
  }).length;
}
