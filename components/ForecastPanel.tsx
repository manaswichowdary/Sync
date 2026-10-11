"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forecastRequestAction } from "@/app/actions";
import type { GroupPageData } from "@/lib/viewTypes";

export function ForecastPanel({ data }: { data: GroupPageData }) {
  const router = useRouter();
  const [message, setMessage] = useState("");

  async function send(summary: string) {
    const result = await forecastRequestAction({ groupId: data.group.id, summary });
    if (!result.ok) {
      setMessage(result.error ?? "Could not send that.");
      return;
    }
    setMessage(result.message ?? "Request sent.");
    router.refresh();
  }

  return (
    <div className="grid">
      <div className="tab-head">
        <div>
          <h2>Calendar</h2>
          <p>{data.calendarNote}</p>
        </div>
      </div>
      {data.forecast.length === 0 && (
        <section className="card empty-card">
          <p className="empty-mark" aria-hidden="true">⏰</p>
          <p className="empty-line">No busy time in the next 7 days.</p>
        </section>
      )}
      {data.forecast.map((item) => (
        <article key={item.summary} className="card">
          <h2>{item.summary}</h2>
          <p className="hint note-line">{item.busyLabel} overlaps {item.pickupLabel}.</p>
          <button className="btn brand" type="button" onClick={() => send(item.summary)}>Send request</button>
        </article>
      ))}
      {message && <div className="notice">{message}</div>}
    </div>
  );
}
