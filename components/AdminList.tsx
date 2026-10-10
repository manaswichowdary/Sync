"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moderateAction } from "@/app/actions";

export function AdminList({
  reports,
}: {
  reports: { id: string; targetType: string; reason: string; label: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function run(reportId: string, action: "restore" | "remove") {
    const result = await moderateAction({ reportId, action });
    setMessage(result.ok ? "Updated." : result.error ?? "Could not update that.");
    if (result.ok) router.refresh();
  }

  if (reports.length === 0) return <p>Nothing is on hold.</p>;

  return (
    <div className="grid">
      {reports.map((report) => (
        <article key={report.id} className="card">
          <p className="meta">{report.targetType}</p>
          <p>{report.label}</p>
          <p className="meta">{report.reason}</p>
          <div className="row">
            <button className="btn secondary" type="button" onClick={() => run(report.id, "restore")}>Restore</button>
            <button className="btn brand" type="button" onClick={() => run(report.id, "remove")}>Remove</button>
          </div>
        </article>
      ))}
      {message && <p className="meta">{message}</p>}
    </div>
  );
}
