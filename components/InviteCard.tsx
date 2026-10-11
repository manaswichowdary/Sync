"use client";

import { useState } from "react";

export function InviteCard({
  codes,
}: {
  codes: { code: string; uses: number; maxUses: number; expiresAt: string }[];
}) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const active = codes[0];

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

  return (
    <section className="card invite-box" id="invite">
      <h2>Invite neighbors</h2>
      {!active && <p>No code yet.</p>}
      {active && (
        <>
          <p className="invite-code">{active.code}</p>
          <button className="btn secondary" type="button" onClick={() => copy(active.code)}>
            {copied === active.code ? "Copied" : "Copy"}
          </button>
        </>
      )}
      {message && <p className="meta">{message}</p>}
    </section>
  );
}
