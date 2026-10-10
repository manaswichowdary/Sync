"use client";

import { useState } from "react";
import { TIME_LABELS } from "@/lib/matching";
import type { Board, Finding, MatchResult } from "@/lib/types";

type GuardResponse = {
  findings: Finding[];
  safeText: string;
  risky: boolean;
  needsManualEdit: boolean;
  rewritten: string | null;
  aiUsed: boolean;
  error?: string;
};

const BOARD_OPTIONS: { id: Board; label: string }[] = [
  { id: "gather", label: "Gather (playdates, hosting)" },
  { id: "help", label: "Help (rides, check ins)" },
  { id: "share", label: "Share (borrow or lend)" },
];

export default function PostPage() {
  const [board, setBoard] = useState<Board>("gather");
  const [text, setText] = useState("");
  const [ages, setAges] = useState("");
  const [times, setTimes] = useState<string[]>([]);
  const [publicOnly, setPublicOnly] = useState(true);

  const [checking, setChecking] = useState(false);
  const [guard, setGuard] = useState<GuardResponse | null>(null);
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState("");

  const [approved, setApproved] = useState(false);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);

  function toggleTime(slot: string) {
    setTimes((prev) => (prev.includes(slot) ? prev.filter((t) => t !== slot) : [...prev, slot]));
  }

  async function runCheck() {
    setError("");
    setGuard(null);
    setApproved(false);
    setMatches(null);
    if (!text.trim()) {
      setError("Write your post first.");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/guard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: GuardResponse = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setGuard(data);
      setFinalText(data.risky ? (data.rewritten ?? data.safeText) : text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setChecking(false);
    }
  }

  async function approve() {
    setApproved(true);
    const kidsAges = ages
      .split(",")
      .map((a) => parseInt(a.trim(), 10))
      .filter((n) => Number.isFinite(n));
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board, kidsAges, times, publicOnly }),
    });
    const data = await res.json();
    setMatches(data.matches ?? []);
  }

  return (
    <>
      <h1>Post a need or offer</h1>
      <p className="lead">
        Write it your way. Before anything goes up, we check for details that could put a child at
        risk, explain why, and offer a safer version. You decide what is posted.
      </p>

      <div className="card">
        <label className="field" htmlFor="board">Where does this go?</label>
        <select id="board" value={board} onChange={(e) => setBoard(e.target.value as Board)}>
          {BOARD_OPTIONS.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>

        <label className="field" htmlFor="text">Your post</label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Example: Looking for a playdate for my 6 year old, Saturday morning, we live near Hudson Park, his name is Leo and he goes to Lincoln Elementary."
        />

        <label className="field" htmlFor="ages">Children's ages, separated by commas (optional)</label>
        <input id="ages" type="text" value={ages} onChange={(e) => setAges(e.target.value)} placeholder="6, 9" />

        <label className="field">When are you free?</label>
        <div className="checks">
          {Object.entries(TIME_LABELS).map(([slot, label]) => (
            <label key={slot}>
              <input type="checkbox" checked={times.includes(slot)} onChange={() => toggleTime(slot)} />
              {label}
            </label>
          ))}
        </div>

        <div className="checks" style={{ marginTop: 12 }}>
          <label>
            <input type="checkbox" checked={publicOnly} onChange={(e) => setPublicOnly(e.target.checked)} />
            Meet in public places only
          </label>
        </div>

        <div className="row">
          <button className="btn brand" onClick={runCheck} disabled={checking}>
            {checking ? "Checking..." : "Check my post"}
          </button>
        </div>
        {error && <div className="notice">{error}</div>}
      </div>

      {guard && (
        <div className="card" style={{ marginTop: 16 }}>
          {!guard.risky ? (
            <div className="notice ok">
              <strong>Looks good.</strong> We did not find details that could put a child at risk.
            </div>
          ) : (
            <>
              <h2>We found {guard.findings.length} thing{guard.findings.length === 1 ? "" : "s"} to look at</h2>
              <div>
                {guard.findings.map((f, i) => (
                  <div key={i} className="finding">
                    <strong>{f.found}</strong>
                    <div>{f.why}</div>
                  </div>
                ))}
              </div>

              <label className="field" htmlFor="final">
                {guard.aiUsed ? "AI helped clean this up" : "Read this, then edit or approve it."}
              </label>
              {guard.needsManualEdit && (
                <div className="notice">
                  Some parts need your own wording, so we left them for you to edit below.
                </div>
              )}
              <textarea id="final" value={finalText} onChange={(e) => setFinalText(e.target.value)} />
              <div className="meta" style={{ color: "var(--muted)" }}>
                You stay in charge. Read it, then approve it.
              </div>
            </>
          )}

          {!approved && (
            <div className="row">
              <button className="btn brand" onClick={approve}>
                {guard.risky ? "Use this version" : "Post it"}
              </button>
              {guard.risky && (
                <button
                  className="btn secondary"
                  onClick={() => {
                    setFinalText(text);
                    approve();
                  }}
                >
                  Keep my own wording
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {approved && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="notice ok">
            <strong>Approved by you.</strong> This demo does not save posts. In a group, only the
            cleaned text you approve is saved.
          </div>
          <h2>Nearby matches</h2>
          <p className="lead">
            Suggestions only. You choose who to contact, and nothing is sent for you.
          </p>
          {matches === null && <p>Looking...</p>}
          {matches?.length === 0 && (
            <p>No close matches yet. Try adding children's ages or more times you are free.</p>
          )}
          <div className="grid">
            {matches?.map((m) => (
              <div key={m.post.id} className="card">
                <p>{m.post.text}</p>
                <div className="meta">{m.post.authorFirstName}, {m.post.area}</div>
                <ul className="reasons">
                  {m.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
                <div className="row">
                  <button className="btn secondary" disabled title="Chat is the next build step">
                    Say hi in chat
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
