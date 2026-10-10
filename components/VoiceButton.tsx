"use client";

import { useRef, useState } from "react";
import type { ShownFinding } from "@/lib/actionResult";

type SpeechResult = { transcript?: string; fallback?: boolean; error?: string };

export function VoiceButton({ onText }: { onText: (text: string, findings: ShownFinding[]) => void }) {
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
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
    onText(data.display, data.findings ?? []);
    setStatus("AI helped clean this up. Read it, then approve it.");
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
    setStatus(note);
    const transcript = await webSpeech();
    if (!transcript.trim()) throw new Error("We could not hear that. Type your request instead.");
    await phrase(transcript);
  }

  async function stop() {
    recorder.current?.stop();
  }

  async function start() {
    setStatus("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      try {
        await useBrowserSpeech("Listening.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Type your request instead.");
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
        setStatus(error instanceof Error ? error.message : "Type your request instead.");
      }
    };
    recorder.current = media;
    media.start();
    setRecording(true);
    setStatus("Listening. Tap again when you are done.");
  }

  return (
    <div className="row">
      <button className="btn secondary" type="button" onClick={recording ? stop : start}>
        {recording ? "Stop" : "Speak your request"}
      </button>
      {status && <span className="meta">{status}</span>}
    </div>
  );
}

type SpeechRecognition = {
  lang: string;
  start: () => void;
  onresult: (event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void;
  onerror: () => void;
};
