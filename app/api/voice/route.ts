import { NextResponse } from "next/server";

const ENDPOINT = "https://api.elevenlabs.io/v1/speech-to-text";
const MODEL = "scribe_v2";

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ fallback: true, error: "missing_key" }, { status: 503 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File)) return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  if (audio.size > 8_000_000) return NextResponse.json({ fallback: true, error: "too_large" }, { status: 413 });

  const body = new FormData();
  body.append("file", audio, audio.name || "speech.webm");
  body.append("model_id", MODEL);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "xi-api-key": key },
      body,
    });
    if (!res.ok) return NextResponse.json({ fallback: true, error: "stt_failed" }, { status: 502 });
    const data = await res.json();
    const transcript = typeof data?.text === "string" ? data.text.trim() : "";
    if (!transcript) return NextResponse.json({ fallback: true, error: "empty" }, { status: 502 });
    return NextResponse.json({ transcript });
  } catch {
    return NextResponse.json({ fallback: true, error: "stt_failed" }, { status: 502 });
  }
}
