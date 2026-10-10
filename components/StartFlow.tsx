"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroupAction, startFounder } from "@/app/actions";
import type { ActionResult } from "@/lib/actionResult";

export function FounderForm() {
  const router = useRouter();
  const [draft, setDraft] = useState({ name: "", email: "", phone: "" });
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await startFounder(draft);
    setPending(false);
    if (!result.ok) setMessage(result.error ?? "Could not start.");
    else {
      setMessage(result.message ?? "Check your email.");
      router.refresh();
    }
  }

  return (
    <form className="card form-card" id="new" onSubmit={submit}>
      <h2>Start a new group</h2>
      <label className="field" htmlFor="founder-name">Name *</label>
      <input id="founder-name" type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
      <label className="field" htmlFor="founder-email">Email *</label>
      <input id="founder-email" type="email" autoComplete="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} required />
      <p className="hint">Email is your login.</p>
      <label className="field" htmlFor="founder-phone">Phone *</label>
      <input id="founder-phone" type="tel" autoComplete="tel" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} required />
      <p className="hint">It is not shown on the group.</p>
      <div className="row">
        <button className="btn brand" disabled={pending}>Email me a login link</button>
      </div>
      {message && <div className="notice">{message}</div>}
    </form>
  );
}

export function NewGroupForm() {
  const [draft, setDraft] = useState({ name: "", neighborhood: "" });
  const [review, setReview] = useState<ActionResult["review"] | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

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
    <form className="card form-card" id="new" onSubmit={(event) => { event.preventDefault(); create(false); }}>
      <h2>Start a new group</h2>
      <label className="field" htmlFor="group-name">Group name *</label>
      <input id="group-name" type="text" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
      <label className="field" htmlFor="neighborhood">Neighborhood name *</label>
      <input id="neighborhood" type="text" value={draft.neighborhood} onChange={(event) => setDraft({ ...draft, neighborhood: event.target.value })} required />
      <p className="hint">A neighborhood name, not a street address.</p>
      <div className="row">
        <button className="btn brand" disabled={pending}>Create group</button>
        {review?.allowCreateAnyway && (
          <button className="btn secondary" type="button" disabled={pending} onClick={() => create(true)}>Create anyway</button>
        )}
      </div>
      {message && <div className="notice">{message}</div>}
    </form>
  );
}
