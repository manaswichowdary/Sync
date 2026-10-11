/**
 * Optional AI step. It only ever sees text that the rules already cleaned,
 * never the original post with a child's details.
 *
 * Without GEMINI_API_KEY (or if the call fails or hits a rate limit) this
 * returns null and the app shows the rule based version instead.
 */

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";

async function askGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !prompt.trim()) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) return null; // includes 429 rate limits
    const data = await res.json();
    const text: unknown = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}

export async function smoothWithGemini(safeText: string): Promise<string | null> {
  if (!safeText.trim()) return null;
  const prompt = [
    "Rewrite this neighborhood post so it reads naturally and warmly.",
    "Rules: keep the same meaning, do not add any new details, do not add names,",
    "places, or times that are not already there, and keep it under 60 words.",
    "Return only the rewritten post.",
    "",
    safeText,
  ].join("\n");
  return askGemini(prompt);
}

/** Clean an already guarded request. Never call this with the original transcript. */
export async function smoothRequest(safeText: string): Promise<string | null> {
  if (!safeText.trim()) return null;
  const prompt = [
    "Clean this spoken request.",
    "Remove filler words such as uh and um.",
    "Remove a sentence that repeats an earlier sentence exactly.",
    "Do not change the meaning. Do not add names, places, times, or other details.",
    "Return only the cleaned request.",
    "",
    safeText,
  ].join("\n");
  return askGemini(prompt);
}
