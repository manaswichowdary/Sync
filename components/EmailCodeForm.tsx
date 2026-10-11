"use client";

import { useState } from "react";
import { confirmEmailCodeAction } from "@/app/actions";
import type { ActionResult } from "@/lib/actionResult";

export function EmailCodeForm({
  email,
  afterStart = false,
  onResend,
}: {
  email: string;
  afterStart?: boolean;
  onResend: () => Promise<ActionResult>;
}) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    setCanResend(false);
    const result = await confirmEmailCodeAction({ email, token, after: afterStart ? "start" : undefined });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "That code did not work.");
      setCanResend(result.resend === true);
    }
  }

  async function sendAgain() {
    setPending(true);
    setError("");
    const result = await onResend();
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not send a new code.");
      setCanResend(true);
      return;
    }
    setToken("");
    setCanResend(false);
  }

  return (
    <form onSubmit={submit}>
      <label className="field" htmlFor="email-code">Or enter the code from the email</label>
      <input
        id="email-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="Code from email"
        maxLength={10}
        value={token}
        onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 10))}
      />
      <button className="btn brand" disabled={pending}>Sign in</button>
      {error && <div className="notice">{error}</div>}
      {canResend && (
        <button className="btn secondary" type="button" disabled={pending} onClick={sendAgain}>
          Send a new code
        </button>
      )}
    </form>
  );
}
