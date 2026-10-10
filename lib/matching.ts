import type { MatchRequest, MatchResult, Post } from "./types";

/**
 * Matching with plain reasons. No scores are ever shown, and nobody is ranked
 * or labeled. We only look at whether a need and an offer fit: ages, times,
 * distance, and comfort preferences.
 */

export const MAX_MILES = 1; // strict proximity limit

export const TIME_LABELS: Record<string, string> = {
  "sat-am": "Saturday morning",
  "sat-pm": "Saturday afternoon",
  "sun-am": "Sunday morning",
  "sun-pm": "Sunday afternoon",
  "weekday-am": "weekday mornings",
  "weekday-pm": "weekday afternoons",
  "weekday-eve": "weekday evenings",
};

export function timeLabel(slot: string): string {
  return TIME_LABELS[slot] ?? slot;
}

function agesClose(a: number[], b: number[], within = 2): number[] {
  const pairs: number[] = [];
  for (const x of a) {
    for (const y of b) {
      if (Math.abs(x - y) <= within) pairs.push(y);
    }
  }
  return pairs;
}

function joinWords(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function matchPosts(
  request: MatchRequest,
  candidates: Post[],
  limit = 3
): MatchResult[] {
  const results: { result: MatchResult; fit: number }[] = [];

  for (const post of candidates) {
    // Street updates are not matched to people.
    if (post.board === "street") continue;
    if (post.board !== request.board) continue;
    if (post.distanceMiles > MAX_MILES) continue;

    const reasons: string[] = [];
    let fit = 0;

    const closeAges = agesClose(request.kidsAges, post.kidsAges);
    if (request.kidsAges.length > 0 && closeAges.length > 0) {
      const unique = [...new Set(closeAges)];
      reasons.push(
        `Children close in age (${joinWords(unique.map((a) => `${a}`))}).`
      );
      fit += 3;
    }

    const sharedTimes = request.times.filter((t) => post.times.includes(t));
    if (sharedTimes.length > 0) {
      reasons.push(`Both free ${joinWords(sharedTimes.map(timeLabel))}.`);
      fit += sharedTimes.length * 2;
    }

    if (request.publicOnly && post.publicOnly) {
      reasons.push("Both prefer to meet in a public place.");
      fit += 1;
    }

    // Distance is always shown, in a rounded, friendly way.
    const miles = Math.max(0.1, Math.round(post.distanceMiles * 10) / 10);
    reasons.push(`About ${miles} mile${miles === 1 ? "" : "s"} away.`);

    // Only suggest posts that fit on at least one real thing besides distance.
    if (fit > 0) results.push({ result: { post, reasons }, fit });
  }

  return results
    .sort((a, b) => b.fit - a.fit || a.result.post.distanceMiles - b.result.post.distanceMiles)
    .slice(0, limit)
    .map((r) => r.result);
}
