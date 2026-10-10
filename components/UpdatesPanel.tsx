"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createReplyAction, createUpdateAction } from "@/app/actions";
import type { PostView } from "@/lib/viewTypes";
import { ThreadActions } from "./ThreadActions";

const TOPICS = [
  { id: "road_block", label: "Road block" },
  { id: "question", label: "Question" },
  { id: "heads_up", label: "Heads up" },
];

export function UpdatesPanel({ groupId, posts }: { groupId: string; posts: PostView[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState("heads_up");
  const [text, setText] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    const result = await createUpdateAction({ groupId, topic, text });
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
      <form className="card" onSubmit={publish}>
        <h2>Share an update</h2>
        <label className="field" htmlFor="topic">Kind</label>
        <select id="topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
          {TOPICS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <label className="field" htmlFor="update-text">Update</label>
        <textarea id="update-text" value={text} onChange={(event) => setText(event.target.value)} />
        <div className="row">
          <button className="btn brand">Post</button>
        </div>
        {message && <div className="notice">{message}</div>}
      </form>
      {posts.map((post) => (
        <article key={post.id} className="card">
          {post.held && <p className="meta">This is on hold.</p>}
          <p className="meta">{TOPICS.find((item) => item.id === post.topic)?.label ?? "Update"}{post.expiresAt ? ` · until ${new Date(post.expiresAt).toLocaleDateString()}` : ""}</p>
          <p>{post.text}</p>
          <p className="meta">{post.authorName}</p>
          {post.replies.map((reply) => (
            <div key={reply.id} className="finding">
              <p>{reply.text}</p>
              <p className="meta">{reply.authorName}{reply.held ? " · on hold" : ""}</p>
              <ThreadActions groupId={groupId} postId={post.id} replyId={reply.id} />
            </div>
          ))}
          <form onSubmit={async (event) => {
            event.preventDefault();
            const result = await createReplyAction({ groupId, postId: post.id, text: replies[post.id] ?? "" });
            if (!result.ok) setMessage(result.error ?? "Could not save that reply.");
            else {
              setReplies({ ...replies, [post.id]: "" });
              router.refresh();
            }
          }}>
            <label className="field" htmlFor={`reply-${post.id}`}>Reply</label>
            <textarea id={`reply-${post.id}`} value={replies[post.id] ?? ""} onChange={(event) => setReplies({ ...replies, [post.id]: event.target.value })} />
            <div className="row">
              <button className="btn secondary">Reply</button>
            </div>
          </form>
          <ThreadActions groupId={groupId} postId={post.id} />
        </article>
      ))}
    </div>
  );
}
