"use client";

import { useEffect, useState } from "react";

export function PrivacyPrompt({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    try {
      if (window.localStorage.getItem("sync-privacy-ok") === "yes") return;
    } catch {
      return;
    }
    setOpen(true);
  }, [signedIn]);

  if (!open) return null;

  return (
    <div className="privacy-backdrop" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="card privacy-card">
        <h2 id="privacy-title">A quick note</h2>
        <p>Your phone stays private. The group sees only words you approve. Meet in public, and you make the final call.</p>
        <button
          className="btn"
          type="button"
          onClick={() => {
            try {
              window.localStorage.setItem("sync-privacy-ok", "yes");
            } catch {
              // The note can still close if storage is blocked.
            }
            setOpen(false);
          }}
        >
          I agree
        </button>
      </div>
    </div>
  );
}
