import { NextResponse } from "next/server";
import { smoothRequest } from "@/lib/gemini";
import { checkPost } from "@/lib/guard";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.slice(0, 1000) : "";
  if (!text.trim()) return NextResponse.json({ error: "We could not hear a request." }, { status: 400 });

  const result = checkPost(text);
  let display = result.safeText;
  if (!result.needsManualEdit && result.safeText.trim()) {
    const smoothed = await smoothRequest(result.safeText);
    if (smoothed) {
      const again = checkPost(smoothed);
      if (!again.risky && !again.needsManualEdit && again.safeText.trim()) display = again.safeText;
    }
  }

  return NextResponse.json({
    display,
    needsManualEdit: result.needsManualEdit,
    findings: result.findings.map((finding) => ({ found: finding.found, why: finding.why })),
  });
}
