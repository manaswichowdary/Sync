"use client";

import { useRef, useState } from "react";
import type { ShownFinding } from "@/lib/actionResult";

type SpeechResult = { transcript?: string; fallback?: boolean; error?: string };

export type VoiceDraft = {
  display: string;
  original: string;
  cleaned: boolean;
  aiChanged: boolean;
  findings: ShownFinding[];
};

export function VoiceButton({
  onText,
  reviewed = false,
}: {
  onText: (draft: VoiceDraft) => void;
  reviewed?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [heard, setHeard] = useState(false);
  const [problem, setProblem] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function phrase(transcript: string) {
    const res = await fetch("/api/phrase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: transcript }),
    });
    const data = await res.json();
    if (!res.ok || typeof data.display !== "string") {
      throw new Error(data.error ?? "Could not prepare that request.");
    }
    const original = typeof data.original === "string" ? data.original : transcript;
    onText({
      display: data.display,
      original,
      cleaned: data.cleaned === true && data.display.trim() !== original.trim(),
      aiChanged: data.aiChanged === true && data.display.trim() !== original.trim(),
      findings: data.findings ?? [],
    });
    setProblem("");
    setHeard(true);
  }

  function webSpeech(): Promise<string> {
    const Recognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!Recognition) return Promise.reject(new Error("This browser cannot hear speech. Type your request instead."));
    return new Promise((resolve, reject) => {
      const rec = new Recognition();
      rec.lang = "en-US";
      rec.onresult = (event) => resolve(event.results[0]?.[0]?.transcript ?? "");
      rec.onerror = () => reject(new Error("We could not hear that. Type your request instead."));
      rec.start();
    });
  }

  async function useBrowserSpeech(note: string) {
    setProblem(note);
    const transcript = await webSpeech();
    if (!transcript.trim()) throw new Error("We could not hear that. Type your request instead.");
    await phrase(transcript);
  }

  async function stop() {
    recorder.current?.stop();
  }

  async function start() {
    setProblem("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      try {
        await useBrowserSpeech("Listening.");
      } catch (error) {
        setProblem(error instanceof Error ? error.message : "Type your request instead.");
      }
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const media = new MediaRecorder(stream);
    chunks.current = [];
    media.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    media.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      setRecording(false);
      const blob = new Blob(chunks.current, { type: media.mimeType || "audio/webm" });
      try {
        const body = new FormData();
        body.set("audio", blob, "speech.webm");
        const res = await fetch("/api/voice", { method: "POST", body });
        const data = (await res.json()) as SpeechResult;
        if (data.transcript) {
          await phrase(data.transcript);
          return;
        }
        await useBrowserSpeech("We could not hear that. Speak once more.");
      } catch (error) {
        setProblem(error instanceof Error ? error.message : "Type your request instead.");
      }
    };
    recorder.current = media;
    media.start();
    setRecording(true);
    setProblem("");
  }

  const note = recording
    ? "Listening. Tap again when you are done."
    : problem
      ? problem
      : heard && !reviewed
        ? "Voice typed this. Read it, then approve it."
        : "";

  return (
    <div className="row">
      <button className="btn secondary" type="button" onClick={recording ? stop : start}>
        {recording ? "Stop" : "Speak your request"}
      </button>
      {note && <span className="meta">{note}</span>}
    </div>
  );
}

type SpeechRecognition = {
  lang: string;
  start: () => void;
  onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
  onerror: () => void;
};
