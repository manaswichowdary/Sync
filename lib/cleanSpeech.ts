/** Drop spoken fillers and a sentence that repeats an earlier one. Meaning stays. */

function tidy(text: string): string {
  return text
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/,\s*,+/g, ",")
    .replace(/^[,\s]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sentenceKey(sentence: string): string {
  return sentence.replace(/[.!?]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function dropMirroredRepeat(text: string): string {
  const trimmed = text.trim();
  const end = trimmed.match(/[.!?]+$/)?.[0] ?? "";
  const words = trimmed.replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length % 2 !== 0) return trimmed;
  const half = words.length / 2;
  const left = words.slice(0, half).join(" ");
  const right = words.slice(half).join(" ");
  if (left.toLowerCase() !== right.toLowerCase()) return trimmed;
  return `${left}${end}`;
}

export function stripSpeechFillers(text: string): string {
  const withoutFillers = tidy(text.replace(/,?\s*\b(?:uh|um)\b\s*,?/gi, " "));
  if (!withoutFillers) return "";

  const seen = new Set<string>();
  const kept: string[] = [];
  for (const piece of withoutFillers.split(/(?<=[.!?])\s+/)) {
    const sentence = piece.trim();
    if (!sentence) continue;
    const key = sentenceKey(sentence);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    kept.push(dropMirroredRepeat(sentence));
  }

  const result = tidy(kept.join(" "));
  if (!result) return "";
  return result.charAt(0).toUpperCase() + result.slice(1);
}
