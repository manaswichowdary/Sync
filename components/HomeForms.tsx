"use client";

import { useState } from "react";
import { createGroupAction, joinWithCode, startLogin, startSignup } from "@/app/actions";
import type { ActionResult } from "@/lib/actionResult";

export function LoginForms() {
  const [tab, setTab] = useState<"join" | "return">("join");
  const [signup, setSignup] = useState({ name: "", email: "", phone: "", code: "" });
  const [loginEmail, setLoginEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submitSignup(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await startSignup(signup);
    setPending(false);
    if (!result.ok) setMessage(result.error ?? "Could not start signup.");
    else setMessage(result.message ?? "Check your email.");
  }

  async function submitLogin(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await startLogin({ email: loginEmail });
    setPending(false);
    if (!result.ok) setMessage(result.error ?? "Could not send a link.");
    else setMessage(result.message ?? "Check your email.");
  }

  return (
    <div className="card login-card form-card">
      <div className="tab-switch" role="tablist">
        <button className={tab === "join" ? "on" : ""} type="button" role="tab" aria-selected={tab === "join"} onClick={() => setTab("join")}>Join with a code</button>
        <button className={tab === "return" ? "on" : ""} type="button" role="tab" aria-selected={tab === "return"} onClick={() => setTab("return")}>I already have an account</button>
      </div>
      {tab === "join" ? (
        <form onSubmit={submitSignup}>
          <label className="field" htmlFor="name">Name *</label>
          <input id="name" type="text" value={signup.name} onChange={(event) => setSignup({ ...signup, name: event.target.value })} required />
          <label className="field" htmlFor="email">Email *</label>
          <input id="email" type="email" autoComplete="email" value={signup.email} onChange={(event) => setSignup({ ...signup, email: event.target.value })} required />
          <p className="hint">Email is your login.</p>
          <label className="field" htmlFor="phone">Phone *</label>
          <input id="phone" type="tel" autoComplete="tel" value={signup.phone} onChange={(event) => setSignup({ ...signup, phone: event.target.value })} required />
          <p className="hint">It is not shown on the group.</p>
          <label className="field" htmlFor="code">Group code *</label>
          <input id="code" type="text" value={signup.code} onChange={(event) => setSignup({ ...signup, code: event.target.value })} required />
          <p className="hint">Ask a neighbor for this.</p>
          <button className="btn brand" disabled={pending}>Email me a login link</button>
        </form>
      ) : (
        <form onSubmit={submitLogin}>
          <label className="field" htmlFor="login-email">Email *</label>
          <input id="login-email" type="email" autoComplete="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
          <p className="hint">Use the email from before.</p>
          <button className="btn brand" disabled={pending}>Email me a login link</button>
        </form>
      )}
      {message && <div className="notice">{message}</div>}
    </div>
  );
}

export function MemberHome() {
  const [code, setCode] = useState("");
  const [draft, setDraft] = useState({ name: "", neighborhood: "" });
  const [review, setReview] = useState<ActionResult["review"] | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await joinWithCode({ code });
    setPending(false);
    if (!result.ok) setMessage(result.error ?? "Could not join.");
  }

  async function create(anyway: boolean) {
    setPending(true);
    setMessage("");
    const result = await createGroupAction({ ...draft, purpose: "other", anyway });
    setPending(false);
    if (!result.ok) {
      setReview(result.review ?? null);
      setMessage(result.error ?? "Could not create the group.");
    }
  }

  return (
    <div className="grid">
      <form className="card" onSubmit={join}>
        <h2>Join a group</h2>
        <label className="field" htmlFor="join-code">Group code</label>
        <input id="join-code" type="text" value={code} onChange={(event) => setCode(event.target.value)} required />
        <div className="row">
          <button className="btn brand" disabled={pending}>Join</button>
        </div>
      </form>
      <form className="card" onSubmit={(event) => { event.preventDefault(); create(false); }}>
        <h2>Create a group</h2>
        <label className="field" htmlFor="group-name">Group name</label>
        <input id="group-name" type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
        <label className="field" htmlFor="neighborhood">Neighborhood name</label>
        <input id="neighborhood" type="text" value={draft.neighborhood} onChange={(event) => setDraft({ ...draft, neighborhood: event.target.value })} required />
        <p className="hint">A neighborhood name, not a street address.</p>
        <div className="row">
          <button className="btn brand" disabled={pending}>Create group</button>
          {review?.allowCreateAnyway && (
            <button className="btn secondary" type="button" disabled={pending} onClick={() => create(true)}>Create anyway</button>
          )}
        </div>
      </form>
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
