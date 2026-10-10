"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendThanksAction } from "@/app/actions";
import type { GroupPageData } from "@/lib/viewTypes";

function explain(badge: string) {
  if (badge.startsWith("Invited by ")) return "A neighbor you know shared a code with you.";
  if (badge === "Helped neighbors") return "You finished help for someone in the group.";
  if (badge.startsWith("Recommended by ")) return "Neighbors chose to recommend you after help.";
  return "";
}

export function RewardsPanel({ data }: { data: GroupPageData }) {
  const router = useRouter();
  const mine = data.members.find((member) => member.userId === data.me.id);
  const notes: { id: string; text: string; about: string }[] = [];
  const prompts: { id: string; about: string; name: string }[] = [];

  for (const post of data.posts) {
    for (const exchange of post.exchanges) {
      const party = exchange.helperId === data.me.id || exchange.requesterId === data.me.id;
      if (!party) continue;
      const other = exchange.helperId === data.me.id ? post.authorName : exchange.helperName;
      if (exchange.thankYou) notes.push({ id: exchange.id, text: exchange.thankYou, about: post.text });
      if (exchange.completedAt && !exchange.viewerRecommended) {
        prompts.push({ id: exchange.id, about: post.text, name: other });
      }
    }
  }

  return (
    <div className="grid">
      <div className="tab-head">
        <div>
          <h2>Rewards</h2>
          <p>No leaderboards. No public scores. Kindness is not a competition.</p>
        </div>
      </div>

      <section className="card">
        <h2>Your badges</h2>
        {(!mine || mine.badges.length === 0) && <p>No badges yet. They show up after an invite, finished help, or a recommendation.</p>}
        {mine?.badges.map((badge) => (
          <p key={badge}>
            <span className="badge">{badge}</span>
            <span className="hint">{explain(badge)}</span>
          </p>
        ))}
      </section>

      <section className="card">
        <h2>Your impact</h2>
        <p className="kicker">Only you can see this</p>
        <p>Help given: {data.me.helpGiven}</p>
        <p>Help received: {data.me.helpReceived}</p>
      </section>

      <section className="card">
        <h2>Group this month</h2>
        <p>Help given this month: {data.group.helpThisMonth}</p>
        <p className="hint">A shared count with no names.</p>
      </section>

      <section className="card">
        <h2>Thank you notes</h2>
        {notes.length === 0 && <p>No thank you notes yet.</p>}
        {notes.map((note) => (
          <article key={note.id} className="finding">
            <p>{note.text}</p>
            <p className="hint">After: {note.about}</p>
          </article>
        ))}
        {prompts.map((item) => (
          <ThanksForm key={item.id} groupId={data.group.id} exchangeId={item.id} about={item.about} name={item.name} onSaved={() => router.refresh()} />
        ))}
      </section>
    </div>
  );
}

function ThanksForm({
  groupId,
  exchangeId,
  about,
  name,
  onSaved,
}: {
  groupId: string;
  exchangeId: string;
  about: string;
  name: string;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [recommend, setRecommend] = useState(false);
  const [message, setMessage] = useState("");

  return (
    <form className="finding" onSubmit={async (event) => {
      event.preventDefault();
      const result = await sendThanksAction({ groupId, exchangeId, note, recommend });
      if (!result.ok) {
        setMessage(result.error ?? "Could not save that.");
        return;
      }
      setMessage("");
      onSaved();
    }}>
      <p>Leave a thank you for {name}.</p>
      <p className="hint">After: {about}</p>
      <label className="field" htmlFor={`thanks-${exchangeId}`}>Thank you note</label>
      <textarea id={`thanks-${exchangeId}`} value={note} onChange={(event) => setNote(event.target.value)} />
      <label className="check-line">
        <input type="checkbox" checked={recommend} onChange={(event) => setRecommend(event.target.checked)} /> Recommend this neighbor
      </label>
      <div className="row">
        <button className="btn brand">Save thank you</button>
      </div>
      {message && <p className="meta">{message}</p>}
    </form>
  );
}
