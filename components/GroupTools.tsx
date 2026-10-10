"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reportAction } from "@/app/actions";

export function GroupTools({
  groupId,
  codes,
}: {
  groupId: string;
  codes: { code: string; uses: number; maxUses: number; expiresAt: string }[];
}) {
  const router = useRouter();
  const [reason, setReason] = useState("Safety concern");
  const [message, setMessage] = useState("");

  async function reportGroup() {
    const result = await reportAction({ groupId, targetType: "group", targetId: groupId, reason });
    setMessage(result.ok ? result.message ?? "Reported." : result.error ?? "Could not report the group.");
    if (result.ok) router.refresh();
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>Invite codes</h2>
        {codes.length === 0 && <p>No codes yet.</p>}
        {codes.map((code) => (
          <p key={code.code}>
            <strong>{code.code}</strong> · {code.uses}/{code.maxUses} uses · until {new Date(code.expiresAt).toLocaleDateString()}
          </p>
        ))}
      </section>
      <section className="card">
        <h2>Report this group</h2>
        <label className="field" htmlFor="group-reason">Reason</label>
        <select id="group-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
          <option>Safety concern</option>
          <option>Spam</option>
          <option>Something else</option>
        </select>
        <div className="row">
          <button className="btn secondary" type="button" onClick={reportGroup}>Report</button>
        </div>
        {message && <p className="meta">{message}</p>}
      </section>
    </div>
  );
}
