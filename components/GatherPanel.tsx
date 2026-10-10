"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGatherAction, rsvpAction } from "@/app/actions";
import type { PostView } from "@/lib/viewTypes";
import { ThreadActions } from "./ThreadActions";

export function GatherPanel({ groupId, posts }: { groupId: string; posts: PostView[] }) {
  const router = useRouter();
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
    router.refresh();
  }

  return (
    <div className="grid">
      <form className="card" onSubmit={announce}>
        <h2>Announce or plan something</h2>
        <label className="field" htmlFor="gather-text">What is happening?</label>
        <textarea id="gather-text" value={text} onChange={(event) => setText(event.target.value)} />
        <div className="row">
          <button className="btn brand">Post</button>
        </div>
        {message && <div className="notice">{message}</div>}
      </form>
      {posts.map((post) => (
        <article key={post.id} className="card">
          {post.safetyNotice && <p className="meta">This stays visible because you are part of the exchange.</p>}
          {post.held && <p className="meta">This is on hold.</p>}
          <p>{post.text}</p>
          <p className="meta">{post.authorName}</p>
          <p>I'm in: {post.rsvpNames.length ? post.rsvpNames.join(", ") : "No one yet."}</p>
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
    </div>
  );
}
