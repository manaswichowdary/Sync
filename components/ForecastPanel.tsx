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
    setMessage("");
    router.refresh();
  }

  return (
    <section className="card">
      <h2>Calendar</h2>
      <p>{data.calendarNote}</p>
      {data.forecast.length === 0 && <p>No pickup conflict in the next 7 days of the sample calendar.</p>}
      {data.forecast.map((item) => (
        <div key={item.summary}>
          <p>{item.summary}</p>
          <p className="hint">{item.busyLabel} overlaps {item.pickupLabel}.</p>
          <button className="btn brand" type="button" onClick={() => send(item.summary)}>
            Send request
          </button>
        </div>
      ))}
      {message && <div className="notice">{message}</div>}
    </section>
  );
}
