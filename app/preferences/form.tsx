"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePrefsAction, threadFlagAction } from "@/app/actions";

export function PreferenceForm({
  hearHelp,
  hearGather,
  hearUpdates,
  helpGiven,
  helpReceived,
  threads,
}: {
  hearHelp: boolean;
  hearGather: boolean;
  hearUpdates: boolean;
  helpGiven: number;
  helpReceived: number;
  threads: { postId: string; groupId: string; text: string; muted: boolean; left: boolean }[];
}) {
  const router = useRouter();
  const [help, setHelp] = useState(hearHelp);
  const [gather, setGather] = useState(hearGather);
  const [updates, setUpdates] = useState(hearUpdates);
  const [message, setMessage] = useState("");

  return (
    <div>
      <h1>Preferences</h1>
      <p className="lead stat-line">Only you can see this: help given {helpGiven}, help received {helpReceived}.</p>
      <form className="card" onSubmit={async (event) => {
        event.preventDefault();
        const result = await savePrefsAction({ help, gather, updates });
        setMessage(result.ok ? "Saved." : result.error ?? "Could not save.");
        if (result.ok) router.refresh();
      }}>
        <div className="checks">
          <label><input type="checkbox" checked={help} onChange={(event) => setHelp(event.target.checked)} /> Help</label>
          <label><input type="checkbox" checked={gather} onChange={(event) => setGather(event.target.checked)} /> Gather</label>
          <label><input type="checkbox" checked={updates} onChange={(event) => setUpdates(event.target.checked)} /> Discussion Forum</label>
        </div>
        <p className="meta">Muting a thread never hides safety notes for an exchange you are part of.</p>
        <div className="row">
          <button className="btn brand">Save</button>
        </div>
        {message && <p className="meta">{message}</p>}
      </form>
      <div className="grid" style={{ marginTop: 16 }}>
        {threads.map((thread) => (
          <article key={thread.postId} className="card">
            <p className="post-line">{thread.text}</p>
            <p className="meta">{thread.muted ? "Muted" : ""} {thread.left ? "Left" : ""}</p>
            <div className="row">
              {thread.muted && (
                <button className="btn secondary" type="button" onClick={async () => {
                  await threadFlagAction({ groupId: thread.groupId, postId: thread.postId, flag: "unmute" });
                  router.refresh();
                }}>Hear this thread</button>
              )}
              {thread.left && (
                <button className="btn secondary" type="button" onClick={async () => {
                  await threadFlagAction({ groupId: thread.groupId, postId: thread.postId, flag: "rejoin" });
                  router.refresh();
                }}>Rejoin this thread</button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
