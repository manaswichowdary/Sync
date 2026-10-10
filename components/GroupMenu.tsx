"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { reportAction, signOut } from "@/app/actions";

export function GroupMenu({ groupId }: { groupId: string }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("Safety concern");
  const [message, setMessage] = useState("");

  useEffect(() => {
    function onPointer(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  async function reportGroup() {
    const result = await reportAction({ groupId, targetType: "group", targetId: groupId, reason });
    setMessage(result.ok ? result.message ?? "Reported." : result.error ?? "Could not report the group.");
    if (result.ok) {
      setReportOpen(false);
      router.refresh();
    }
  }

  return (
    <div className="menu" ref={box}>
      <button className="text-btn" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Menu
      </button>
      {open && (
        <div className="menu-panel">
          <Link href="/?view=home" onClick={() => setOpen(false)}>Home</Link>
          <Link href={`/g/${groupId}?tab=people`} onClick={() => setOpen(false)}>Neighbors</Link>
          <Link href="/preferences" onClick={() => setOpen(false)}>Preferences</Link>
          <Link href="/safety" onClick={() => setOpen(false)}>Safety</Link>
          <button type="button" onClick={() => { setOpen(false); setReportOpen(true); }}>Report this group</button>
          <form action={signOut}>
            <button type="submit">Log out</button>
          </form>
        </div>
      )}
      {reportOpen && (
        <div className="privacy-backdrop" onClick={() => setReportOpen(false)}>
          <div className="card privacy-card" role="dialog" aria-labelledby="report-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="report-title">Report this group</h2>
            <label className="field" htmlFor="group-reason">Reason</label>
            <select id="group-reason" value={reason} onChange={(event) => setReason(event.target.value)}>
              <option>Safety concern</option>
              <option>Spam</option>
              <option>Something else</option>
            </select>
            <div className="row">
              <button className="btn secondary" type="button" onClick={() => setReportOpen(false)}>Cancel</button>
              <button className="btn brand" type="button" onClick={reportGroup}>Report</button>
            </div>
            {message && <p className="meta">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
