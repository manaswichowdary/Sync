"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGatherAction, rsvpAction } from "@/app/actions";
import type { PostView } from "@/lib/viewTypes";
import { ThreadActions } from "./ThreadActions";

export function GatherPanel({ groupId, posts }: { groupId: string; posts: PostView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

  async function announce(event: React.FormEvent) {
    event.preventDefault();
    const result = await createGatherAction({ groupId, text });
    if (!result.ok) {
      setMessage(result.error ?? "Could not post that.");
      if (result.safeText) setText(result.safeText);
      return;
    }
    setText("");
    setMessage("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="grid">
      <div className="tab-head">
        <div>
          <h2>Gather</h2>
          <p>Plan a small meetup with neighbors.</p>
        </div>
        <button className="btn" type="button" onClick={() => setOpen((value) => !value)}>Plan something</button>
      </div>
      {open && (
        <form className="card composer" onSubmit={announce}>
          <h2>Announce or plan something</h2>
          <label className="field" htmlFor="gather-text">What is happening?</label>
          <textarea id="gather-text" value={text} onChange={(event) => setText(event.target.value)} />
          <div className="row">
            <button className="btn brand">Post</button>
          </div>
          {message && <div className="notice">{message}</div>}
        </form>
      )}
      {posts.length === 0 && (
        <section className="card empty-card">
          <p className="empty-mark" aria-hidden="true">🤗</p>
          <p>No plans yet.</p>
        </section>
      )}
      {posts.map((post) => (
        <article key={post.id} className="card">
          {post.safetyNotice && <p className="meta">This stays visible because you are part of the exchange.</p>}
          {post.held && <p className="meta">This is on hold.</p>}
          <p>{post.text}</p>
          <p className="meta">{post.authorName}</p>
          <p>I&apos;m in: {post.rsvpNames.length ? post.rsvpNames.join(", ") : "No one yet."}</p>
          <button className="btn secondary" type="button" onClick={async () => {
            const result = await rsvpAction({ groupId, postId: post.id });
            if (!result.ok) setMessage(result.error ?? "Could not update that.");
            else router.refresh();
          }}>
            {post.viewerIn ? "I'm out" : "I'm in"}
          </button>
          <ThreadActions groupId={groupId} postId={post.id} />
        </article>
      ))}
      {message && !open && <div className="notice">{message}</div>}
    </div>
  );
}
