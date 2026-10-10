"use client";

import { useState } from "react";

/**
 * "Still blocked" / "Cleared" buttons. Counts live in the browser for the demo.
 * Next step: save these to the database so every neighbor sees the same numbers.
 */
export default function StreetControls({
  confirmations,
  minutesAgo,
}: {
  confirmations: number;
  minutesAgo: number;
}) {
  const [count, setCount] = useState(confirmations);
  const [last, setLast] = useState(minutesAgo);
  const [status, setStatus] = useState<"blocked" | "cleared" | null>(null);

  function confirm(next: "blocked" | "cleared") {
    if (status === next) return;
    setStatus(next);
    setCount((c) => c + 1);
    setLast(0);
  }

  const when = last === 0 ? "just now" : last < 60 ? `${last} minutes ago` : `${Math.round(last / 60)} hours ago`;

  return (
    <div>
      <div className="meta">
        {count} neighbors confirmed. Last confirmed {when}.
        {status === "cleared" && " Marked cleared by you."}
        {status === "blocked" && " Marked still blocked by you."}
      </div>
      <div className="row">
        <button className="btn secondary" onClick={() => confirm("blocked")}>Still blocked</button>
        <button className="btn secondary" onClick={() => confirm("cleared")}>Cleared</button>
      </div>
    </div>
  );
}
