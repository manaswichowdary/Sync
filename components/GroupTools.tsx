"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInviteAction, reportAction } from "@/app/actions";
import { CODE_DEFAULT_MAX_USES, CODE_EXPIRY_DAYS } from "@/lib/config";

export function GroupTools({
  groupId,
  codes,
}: {
  groupId: string;
  codes: { code: string; uses: number; maxUses: number; expiresAt: string }[];
}) {
  const router = useRouter();
  const [maxUses, setMaxUses] = useState(String(CODE_DEFAULT_MAX_USES));
  const [days, setDays] = useState(String(CODE_EXPIRY_DAYS));
  const [reason, setReason] = useState("Safety concern");
  const [message, setMessage] = useState("");

  async function makeCode(event: React.FormEvent) {
    event.preventDefault();
    const result = await createInviteAction({ groupId, maxUses: Number(maxUses), days: Number(days) });
    setMessage(result.ok ? result.message ?? "New code ready." : result.error ?? "Could not make a code.");
    if (result.ok) router.refresh();
  }

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
        <form onSubmit={makeCode}>
          <label className="field" htmlFor="max-uses">Max uses</label>
          <input id="max-uses" type="number" min={1} max={CODE_DEFAULT_MAX_USES} value={maxUses} onChange={(event) => setMaxUses(event.target.value)} />
          <label className="field" htmlFor="code-days">Days until expiry</label>
          <input id="code-days" type="number" min={1} max={CODE_EXPIRY_DAYS} value={days} onChange={(event) => setDays(event.target.value)} />
          <div className="row">
            <button className="btn secondary">Make a code</button>
          </div>
        </form>
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
