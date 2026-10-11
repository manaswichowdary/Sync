import { NextResponse } from "next/server";
import { stripSpeechFillers } from "@/lib/cleanSpeech";
import { smoothRequest } from "@/lib/gemini";
import { checkPost } from "@/lib/guard";

function words(value: string): string {
  return value.toLowerCase().replace(/[.!?]+/g, " ").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.slice(0, 1000) : "";
  if (!text.trim()) return NextResponse.json({ error: "We could not hear a request." }, { status: 400 });

  const result = checkPost(text);
  const passed = !result.needsManualEdit && result.safeText.trim().length > 0;
  let display = result.safeText;
  let aiChanged = false;

  if (passed) {
    const fallback = stripSpeechFillers(result.safeText);
    const local = fallback.trim() ? fallback : result.safeText;
    const smoothed = await smoothRequest(result.safeText);
    if (smoothed && words(smoothed) !== words(result.safeText)) {
      const again = checkPost(smoothed);
      if (!again.risky && !again.needsManualEdit && again.safeText.trim() && words(again.safeText) !== words(result.safeText)) {
        display = again.safeText;
        aiChanged = true;
      } else {
        display = local;
      }
    } else {
      display = local;
    }
  }

  const cleaned = words(display) !== words(result.safeText);

  return NextResponse.json({
    display,
    original: result.safeText,
    cleaned,
    aiChanged: aiChanged && cleaned,
    needsManualEdit: result.needsManualEdit,
    findings: result.findings.map((finding) => ({ found: finding.found, why: finding.why })),
  });
}
