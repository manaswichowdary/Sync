"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reportAction, threadFlagAction } from "@/app/actions";

export function ThreadActions({
  groupId,
  postId,
  replyId,
}: {
  groupId: string;
  postId: string;
  replyId?: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("Safety concern");
  const [message, setMessage] = useState("");

  async function flag(next: "mute" | "leave") {
    const result = await threadFlagAction({ groupId, postId, flag: next });
    setMessage(result.ok ? "Saved." : result.error ?? "Could not save that.");
    if (result.ok) router.refresh();
  }

  async function report() {
    const result = await reportAction({
      groupId,
      targetType: replyId ? "reply" : "post",
      targetId: replyId ?? postId,
      reason,
    });
    setMessage(result.ok ? result.message ?? "Reported." : result.error ?? "Could not report that.");
    if (result.ok) router.refresh();
  }

  return (
    <div>
      <div className="row">
        <button className="btn secondary" type="button" onClick={() => flag("mute")}>Mute this thread</button>
        <button className="btn secondary" type="button" onClick={() => flag("leave")}>Leave this thread</button>
      </div>
      <label className="field" htmlFor={`reason-${replyId ?? postId}`}>Report reason</label>
      <select id={`reason-${replyId ?? postId}`} value={reason} onChange={(event) => setReason(event.target.value)}>
        <option>Safety concern</option>
        <option>Spam</option>
        <option>Something else</option>
      </select>
      <div className="row">
        <button className="btn secondary" type="button" onClick={report}>Report</button>
      </div>
      {message && <p className="meta">{message}</p>}
    </div>
  );
}
