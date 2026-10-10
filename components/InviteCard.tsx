"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInviteAction } from "@/app/actions";
import { CODE_DEFAULT_MAX_USES, CODE_EXPIRY_DAYS } from "@/lib/config";

function prettyDate(iso: string) {
  const date = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function InviteCard({
  groupId,
  codes,
}: {
  groupId: string;
  codes: { code: string; uses: number; maxUses: number; expiresAt: string }[];
}) {
  const router = useRouter();
  const [maxUses, setMaxUses] = useState(String(CODE_DEFAULT_MAX_USES));
  const [days, setDays] = useState(String(CODE_EXPIRY_DAYS));
  const [message, setMessage] = useState("");
  const [made, setMade] = useState("");
  const [copied, setCopied] = useState("");
  const active = codes.find((item) => item.code === made) ?? codes[0];
  const shownCode = made || active?.code || "";

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(""), 2000);
    } catch {
      setCopied("");
      setMessage("Could not copy that code.");
    }
  }

  async function makeCode(event: React.FormEvent) {
    event.preventDefault();
    const result = await createInviteAction({ groupId, maxUses: Number(maxUses), days: Number(days) });
    const ready = result.ok ? (result.message ?? "") : "";
    const fresh = ready.startsWith("New code ready.") ? ready.slice("New code ready.".length).trim() : "";
    setMade(fresh);
    setMessage(result.ok ? (fresh ? "New code ready." : ready || "New code ready.") : result.error ?? "Could not make a code.");
    if (result.ok) router.refresh();
  }

  return (
    <section className="card invite-box" id="invite">
      <h2>Invite neighbors</h2>
      {!shownCode && <p>No code yet.</p>}
      {shownCode && (
        <>
          <p className="invite-code">{shownCode}</p>
          {active && shownCode === active.code && (
            <p className="hint">{active.uses} of {active.maxUses} uses · until {prettyDate(active.expiresAt)}</p>
          )}
          <button className="btn secondary" type="button" onClick={() => copy(shownCode)}>
            {copied === shownCode ? "Copied" : "Copy"}
          </button>
        </>
      )}
      <details className="invite-make">
        <summary className="btn brand">Make a code</summary>
        <form className="invite-drop" onSubmit={makeCode}>
          <label className="field" htmlFor="max-uses">Max uses</label>
          <input id="max-uses" type="number" min={1} max={CODE_DEFAULT_MAX_USES} value={maxUses} onChange={(event) => setMaxUses(event.target.value)} />
          <label className="field" htmlFor="code-days">Days until expiry</label>
          <input id="code-days" type="number" min={1} max={CODE_EXPIRY_DAYS} value={days} onChange={(event) => setDays(event.target.value)} />
          <div className="row">
            <button className="btn brand">Make a code</button>
          </div>
          {message && <p className="meta">{message}</p>}
          {made && <p className="invite-code">{made}</p>}
        </form>
      </details>
    </section>
  );
}
