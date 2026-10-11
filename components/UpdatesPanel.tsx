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

function when(iso: string) {
  const date = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hour = date.getHours();
  const minute = String(date.getMinutes()).padStart(2, "0");
  const clock = hour % 12 || 12;
  return `${months[date.getMonth()]} ${date.getDate()}, ${clock}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}

function daysLeft(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(ms / 86400000));
  return days === 1 ? "Expires in 1 day" : `Expires in ${days} days`;
}

export function UpdatesPanel({ groupId, posts }: { groupId: string; posts: PostView[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="grid">
      <div className="tab-head">
        <div>
          <h2>Discussion Forum</h2>
          <p>Share a short note with the group.</p>
        </div>
        <button className="btn" type="button" onClick={() => setOpen((value) => !value)}>New post</button>
      </div>
      {open && (
        <form className="card composer" onSubmit={publish}>
          <h2>Share a note</h2>
          <div className="chip-row" role="group" aria-label="Post type">
            {TOPICS.map((item) => (
              <button
                key={item.id}
                className={topic === item.id ? "tab-pill on" : "tab-pill"}
                type="button"
                onClick={() => setTopic(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="field" htmlFor="update-text">Note</label>
          <textarea id="update-text" value={text} onChange={(event) => setText(event.target.value)} />
          <div className="row">
            <button className="btn brand">Post</button>
          </div>
          {message && <div className="notice">{message}</div>}
        </form>
      )}
      {posts.length === 0 && (
        <section className="card empty-card">
          <p className="empty-mark" aria-hidden="true">📝</p>
          <p className="empty-line">No notes yet.</p>
        </section>
      )}
      {posts.map((post) => (
        <article key={post.id} className="card">
          {post.held && <p className="meta">This is on hold.</p>}
          <p className="meta">
            {TOPICS.find((item) => item.id === post.topic)?.label ?? "Note"}
            {post.expiresAt ? ` · ${daysLeft(post.expiresAt)}` : ""}
          </p>
          <p className="post-line">{post.text}</p>
          <p className="meta">{post.authorName} · {when(post.createdAt)}</p>
          {post.replies.map((reply) => (
            <div key={reply.id} className="finding">
              <p className="post-line">{reply.text}</p>
              <p className="meta">{reply.authorName} · {when(reply.createdAt)}{reply.held ? " · on hold" : ""}</p>
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
      {message && !open && <div className="notice">{message}</div>}
    </div>
  );
}
