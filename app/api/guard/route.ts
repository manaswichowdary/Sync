import { NextResponse } from "next/server";
import { checkPost } from "@/lib/guard";
import { smoothWithGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.slice(0, 1000) : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Write a post first." }, { status: 400 });
  }

  // 1. Rules run first, locally. The original text is never stored or sent anywhere.
  const result = checkPost(text);

  // 2. Optional AI step sees only the cleaned text, and only if nothing needs a manual edit.
  let rewritten: string | null = null;
  if (result.risky && !result.needsManualEdit) {
    rewritten = await smoothWithGemini(result.safeText);
  }

  return NextResponse.json({
    ...result,
    rewritten,
    aiUsed: rewritten !== null,
  });
}
