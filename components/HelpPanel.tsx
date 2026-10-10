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
  sendThanksAction,
} from "@/app/actions";
import type { ShownFinding } from "@/lib/actionResult";
import type { GroupPageData, PostView } from "@/lib/viewTypes";
import { ThreadActions } from "./ThreadActions";
import { VoiceButton } from "./VoiceButton";

export function HelpPanel({ data }: { data: GroupPageData }) {
  const router = useRouter();
  const [mode, setMode] = useState<"need" | "offer">("need");
  const [text, setText] = useState("");
  const [childName, setChildName] = useState("");
  const [childSchool, setChildSchool] = useState("");
  const [offerText, setOfferText] = useState("");
  const [weekday, setWeekday] = useState("thursday");
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("17:00");
  const [note, setNote] = useState("");
  const [findings, setFindings] = useState<ShownFinding[]>([]);
  const [message, setMessage] = useState("");
  const [checked, setChecked] = useState(false);
  const [aiCleaned, setAiCleaned] = useState(false);

  const needs = data.posts.filter((post) => post.kind === "need");
  const offers = data.posts.filter((post) => post.kind === "offer");

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
    setAiCleaned(false);
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

  return (
    <div className="grid">
      <section className="card">
        <h2>Help given this month: {data.group.helpThisMonth}</h2>
        <p className="meta">This is a shared count with no names.</p>
        <p className="meta">Only you can see this: help given {data.me.helpGiven}, help received {data.me.helpReceived}.</p>
      </section>

      <div className="row">
        <button className={mode === "need" ? "btn brand" : "btn secondary"} type="button" onClick={() => setMode("need")}>I need help</button>
        <button className={mode === "offer" ? "btn brand" : "btn secondary"} type="button" onClick={() => setMode("offer")}>I can help</button>
      </div>

      {mode === "need" ? (
        <section className="card">
          <label className="field" htmlFor="need-text">Your request</label>
          <textarea id="need-text" value={text} onChange={(event) => { setText(event.target.value); setChecked(false); setAiCleaned(false); }} />
          <VoiceButton onText={(next, nextFindings) => { setText(next); setFindings(nextFindings); setChecked(true); setAiCleaned(true); }} />
          {aiCleaned && <p className="ai-label">AI helped clean this up</p>}
          <label className="field" htmlFor="child-name">Child's name, optional and private</label>
          <input id="child-name" value={childName} onChange={(event) => setChildName(event.target.value)} />
          <label className="field" htmlFor="child-school">School, optional and private</label>
          <input id="child-school" value={childSchool} onChange={(event) => setChildSchool(event.target.value)} />
          <p className="meta">These stay off the group post. They go only to the one helper you confirm, with a family code word, and are deleted 24 hours after you both tap Done.</p>
          <div className="row">
            <button className="btn secondary" type="button" onClick={preview}>Check my request</button>
            <button
              className="btn brand"
              type="button"
              disabled={!checked}
              onClick={async () => show(await createNeedAction({ groupId: data.group.id, text, childName, childSchool }))}
            >
              Approve and post
            </button>
          </div>
          <Findings findings={findings} />
        </section>
      ) : (
        <section className="card">
          <h2>Free time</h2>
          <label className="field" htmlFor="weekday">Weekday</label>
          <select id="weekday" value={weekday} onChange={(event) => setWeekday(event.target.value)}>
            {["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].map((day) => (
              <option key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</option>
            ))}
          </select>
          <label className="field" htmlFor="start">Start</label>
          <input id="start" type="time" value={start} onChange={(event) => setStart(event.target.value)} />
          <label className="field" htmlFor="end">End</label>
          <input id="end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
          <label className="field" htmlFor="offer-note">Note</label>
          <textarea id="offer-note" value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="row">
            <button className="btn brand" type="button" onClick={async () => show(await createStandingOfferAction({ groupId: data.group.id, weekday, start, end, note }), "note")}>
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

      <section>
        <h2>Free times</h2>
        <div className="grid">
          {data.freeTimes.length === 0 && <p>No free times yet.</p>}
          {data.freeTimes.map((offer) => (
            <article key={offer.id} className="card">
              <p>{offer.firstName} · {offer.weekday} · {offer.start} to {offer.end}</p>
              {offer.note && <p>{offer.note}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="grid">
        {needs.map((post) => (
          <NeedCard key={post.id} post={post} groupId={data.group.id} me={data.me.id} onDone={show} />
        ))}
        {offers.map((post) => (
          <article key={post.id} className="card">
            <p>{post.text}</p>
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
  const [note, setNote] = useState("");
  const [recommend, setRecommend] = useState(false);
  const chosen = post.exchanges.some((exchange) => exchange.chosen);
  const mine = post.exchanges.find((exchange) => exchange.helperId === me);

  return (
    <article className="card">
      {post.safetyNotice && <p className="meta">This stays visible because you are part of the exchange.</p>}
      {post.held && <p className="meta">This is on hold.</p>}
      <p>{post.text}</p>
      <p className="meta">{post.authorName}</p>
      {post.pendingChild && <p className="meta">Private details saved. They stay hidden until you confirm one helper.</p>}
      {post.authorId !== me && !mine && !post.held && (
        <button className="btn secondary" type="button" onClick={async () => onDone(await offerHelpAction({ groupId, postId: post.id }))}>
          Offer to help
        </button>
      )}
      {post.exchanges.map((exchange) => {
        const party = exchange.helperId === me || exchange.requesterId === me;
        const myDone = exchange.helperId === me ? exchange.helperDone : exchange.requesterDone;
        return (
          <div key={exchange.id} className="finding">
            <p>{exchange.helperName} offered to help.</p>
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
            {exchange.thankYou && <p>Thank you: {exchange.thankYou}</p>}
            {exchange.completedAt && party && !exchange.viewerRecommended && (
              <form onSubmit={async (event) => {
                event.preventDefault();
                onDone(await sendThanksAction({ groupId, exchangeId: exchange.id, note, recommend }));
              }}>
                <label className="field" htmlFor={`thanks-${exchange.id}`}>Thank you note</label>
                <textarea id={`thanks-${exchange.id}`} value={note} onChange={(event) => setNote(event.target.value)} />
                <label>
                  <input type="checkbox" checked={recommend} onChange={(event) => setRecommend(event.target.checked)} /> Recommend this neighbor
                </label>
                <div className="row">
                  <button className="btn secondary">Save thank you</button>
                </div>
              </form>
            )}
          </div>
        );
      })}
      <ThreadActions groupId={groupId} postId={post.id} />
    </article>
  );
}
