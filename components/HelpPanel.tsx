"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmHelperAction,
  createNeedAction,
  createOfferAction,
  createStandingOfferAction,
  markDoneAction,
  offerHelpAction,
} from "@/app/actions";
import type { ShownFinding } from "@/lib/actionResult";
import type { GroupPageData, PostView } from "@/lib/viewTypes";
import { ThreadActions } from "./ThreadActions";
import { VoiceButton, type VoiceDraft } from "./VoiceButton";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function statusOf(post: PostView) {
  if (post.exchanges.some((exchange) => exchange.completedAt)) return "Done";
  if (post.exchanges.some((exchange) => exchange.chosen)) return "Confirmed";
  if (post.exchanges.length > 0) return "Offered";
  return "Open";
}

function dayName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function HelpPanel({ data, start, hideEmpty = false }: { data: GroupPageData; start?: string; hideEmpty?: boolean }) {
  const router = useRouter();
  const [composer, setComposer] = useState<"need" | "offer" | null>(start === "free" ? "offer" : start === "request" ? "need" : null);
  const [text, setText] = useState("");
  const [childName, setChildName] = useState("");
  const [childSchool, setChildSchool] = useState("");
  const [offerText, setOfferText] = useState("");
  const [weekday, setWeekday] = useState("thursday");
  const [startTime, setStartTime] = useState("15:00");
  const [end, setEnd] = useState("17:00");
  const [note, setNote] = useState("");
  const [findings, setFindings] = useState<ShownFinding[]>([]);
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState(false);
  const [originalText, setOriginalText] = useState<string | null>(null);
  const [cleaned, setCleaned] = useState(false);
  const [aiChanged, setAiChanged] = useState(false);

  const needs = data.posts.filter((post) => post.kind === "need");
  const offers = data.posts.filter((post) => post.kind === "offer");
  const empty = needs.length === 0 && offers.length === 0;

  function show(
    result: { ok: boolean; error?: string; message?: string; safeText?: string; findings?: ShownFinding[] },
    field: "request" | "offer" | "note" = "request"
  ) {
    if (!result.ok) {
      setMessage(result.error ?? "Could not save that.");
      if (result.safeText) {
        if (field === "offer") setOfferText(result.safeText);
        else if (field === "note") setNote(result.safeText);
        else setText(result.safeText);
      }
      if (result.findings) setFindings(result.findings);
      return;
    }
    setMessage("");
    setFindings([]);
    setText("");
    setChildName("");
    setChildSchool("");
    setOfferText("");
    setNote("");
    setChecked(false);
    setOriginalText(null);
    setCleaned(false);
    setAiChanged(false);
    setComposer(null);
    router.refresh();
  }

  async function preview() {
    setMessage("");
    const res = await fetch("/api/guard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Could not check that.");
      return;
    }
    setFindings((body.findings ?? []).map((finding: { found: string; why: string }) => ({ found: finding.found, why: finding.why })));
    setText(body.rewritten ?? body.safeText ?? text);
    setChecked(true);
  }

  function applyVoice(draft: VoiceDraft) {
    setText(draft.display);
    setFindings(draft.findings);
    setChecked(false);
    setAiChanged(draft.aiChanged);
    setCleaned(draft.cleaned);
    setOriginalText(draft.cleaned ? draft.original : null);
  }

  function undoClean() {
    if (originalText === null) return;
    setText(originalText);
    setOriginalText(null);
    setCleaned(false);
    setAiChanged(false);
    setChecked(false);
  }

  return (
    <div className="grid">
      <div className="tab-head">
        <div>
          <h2>Help</h2>
          <p>Ask for a hand, or say when you are free.</p>
        </div>
        <button className="btn flow-btn" type="button" onClick={() => setComposer(composer === "need" ? null : "need")}>New request</button>
      </div>
      <div className="row">
        <button className="btn secondary" type="button" onClick={() => setComposer(composer === "offer" ? null : "offer")}>I can help</button>
      </div>

      {composer === "need" && (
        <section className="card composer">
          <h2>1. Write</h2>
          <label className="field" htmlFor="need-text">Your request</label>
          <textarea
            id="need-text"
            value={text}
            onChange={(event) => {
              const next = event.target.value;
              setText(next);
              setChecked(false);
              setAiChanged(false);
              if (originalText === null || next === originalText) {
                setCleaned(false);
                setOriginalText(null);
              }
            }}
          />
          {cleaned && originalText !== null && (
            <p className="meta">
              Cleaned up
              <button className="undo-link" type="button" onClick={undoClean}>Undo</button>
            </p>
          )}
          {aiChanged && <p className="ai-label">AI helped clean this up</p>}
          <VoiceButton reviewed={checked} onText={applyVoice} />
          <details className="private-box">
            <summary>Private details, shared only with your confirmed helper</summary>
            <label className="field" htmlFor="child-name">Child&apos;s name</label>
            <input id="child-name" value={childName} onChange={(event) => setChildName(event.target.value)} />
            <label className="field" htmlFor="child-school">School</label>
            <input id="child-school" value={childSchool} onChange={(event) => setChildSchool(event.target.value)} />
            <p className="meta">These stay off the group post. They go only to the one helper you confirm, with a family code word, and are deleted 24 hours after you both tap Done.</p>
          </details>
          <h2>2. Check</h2>
          <button className="btn secondary flow-btn" type="button" onClick={preview}>Check my request</button>
          {checked && <p className="meta">Privacy check done.</p>}
          <Findings findings={findings} />
          <h2 className="step-next">3. Approve and post</h2>
          <button
            className="btn brand"
            type="button"
            disabled={!checked}
            onClick={async () => show(await createNeedAction({ groupId: data.group.id, text, childName, childSchool }))}
          >
            Approve and post
          </button>
        </section>
      )}

      {composer === "offer" && (
        <section className="card composer">
          <h2>Free time</h2>
          <label className="field" htmlFor="weekday">Weekday</label>
          <select id="weekday" value={weekday} onChange={(event) => setWeekday(event.target.value)}>
            {DAYS.map((day) => (
              <option key={day} value={day}>{dayName(day)}</option>
            ))}
          </select>
          <label className="field" htmlFor="start">Start</label>
          <input id="start" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
          <label className="field" htmlFor="end">End</label>
          <input id="end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          <label className="field" htmlFor="offer-note">Note</label>
          <textarea id="offer-note" value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="row">
            <button className="btn brand" type="button" onClick={async () => show(await createStandingOfferAction({ groupId: data.group.id, weekday, start: startTime, end, note }), "note")}>
              Save free time
            </button>
          </div>
          <label className="field" htmlFor="offer-text">Or post one offer</label>
          <textarea id="offer-text" value={offerText} onChange={(event) => setOfferText(event.target.value)} />
          <div className="row">
            <button className="btn secondary" type="button" onClick={async () => show(await createOfferAction({ groupId: data.group.id, text: offerText }), "offer")}>
              Post offer
            </button>
          </div>
        </section>
      )}

      {message && <div className="notice">{message}</div>}

      {empty && !hideEmpty && (
        <section className="card empty-card">
          <p className="empty-mark" aria-hidden="true">❤️</p>
          <p className="empty-line">No requests yet.</p>
        </section>
      )}

      <section className="grid">
        {needs.map((post) => (
          <NeedCard key={post.id} post={post} groupId={data.group.id} me={data.me.id} onDone={show} />
        ))}
        {offers.map((post) => (
          <article key={post.id} className="card">
            <p className="status-chip">{statusOf(post)}</p>
            <p className="post-line">{post.text}</p>
            <p className="meta">{post.authorName}</p>
            {post.held && <p className="meta">This is on hold.</p>}
            <ThreadActions groupId={data.group.id} postId={post.id} />
          </article>
        ))}
      </section>
    </div>
  );
}

function Findings({ findings }: { findings: ShownFinding[] }) {
  if (findings.length === 0) return null;
  return (
    <div>
      {findings.map((finding, index) => (
        <div key={index} className="finding">
          <strong>{finding.found}</strong>
          <div>{finding.why}</div>
        </div>
      ))}
    </div>
  );
}

function NeedCard({
  post,
  groupId,
  me,
  onDone,
}: {
  post: PostView;
  groupId: string;
  me: string;
  onDone: (result: { ok: boolean; error?: string; safeText?: string; findings?: ShownFinding[] }) => void;
}) {
  const chosen = post.exchanges.some((exchange) => exchange.chosen);
  const mine = post.exchanges.find((exchange) => exchange.helperId === me);

  return (
    <article className="card">
      <p className="status-chip">{statusOf(post)}</p>
      {post.safetyNotice && <p className="meta">This stays visible because you are part of the exchange.</p>}
      {post.held && <p className="meta">This is on hold.</p>}
      <p className="post-line">{post.text}</p>
      <p className="meta">{post.authorName}</p>
      {post.pendingChild && <p className="meta">Private details saved. They stay hidden until you confirm one helper.</p>}
      {post.authorId !== me && !mine && !post.held && (
        <div className="row">
          <button className="btn secondary" type="button" onClick={async () => onDone(await offerHelpAction({ groupId, postId: post.id }))}>
            Offer to help
          </button>
        </div>
      )}
      {post.exchanges.map((exchange) => {
        const party = exchange.helperId === me || exchange.requesterId === me;
        const myDone = exchange.helperId === me ? exchange.helperDone : exchange.requesterDone;
        return (
          <div key={exchange.id} className="finding">
            <p className="post-line">{exchange.helperName} offered to help.</p>
            {post.authorId === me && !chosen && (
              <button className="btn brand" type="button" onClick={async () => onDone(await confirmHelperAction({ groupId, exchangeId: exchange.id }))}>
                Confirm {exchange.helperName}
              </button>
            )}
            {exchange.chosen && party && !exchange.completedAt && !myDone && (
              <button className="btn brand" type="button" onClick={async () => onDone(await markDoneAction({ groupId, exchangeId: exchange.id }))}>
                Done
              </button>
            )}
            {exchange.codeWord && <p>Family code word: {exchange.codeWord}</p>}
            {exchange.childLine && <p>Private details: {exchange.childLine}</p>}
            {exchange.parentPhone && <p>Phone for this exchange only: {exchange.parentPhone}</p>}
          </div>
        );
      })}
      <ThreadActions groupId={groupId} postId={post.id} />
    </article>
  );
}
