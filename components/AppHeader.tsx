"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions";
import { SyncMark } from "@/components/SyncMark";

export function AppHeader({ groupId, admin }: { groupId: string | null; admin: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const homeHref = groupId ? `/g/${groupId}` : "/start";

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  return (
    <header className="group-head">
      <Link href={homeHref} className="logo" aria-label="Sync">
        <SyncMark />
      </Link>
      <div className="menu" ref={box}>
        <button className="text-btn" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          Menu
        </button>
        {open && (
          <div className="menu-panel">
            {groupId ? (
              <Link href={`/g/${groupId}`} onClick={close}>Your group</Link>
            ) : (
              <Link href="/start" onClick={close}>Start or join a group</Link>
            )}
            <Link href="/preferences" onClick={close}>Preferences</Link>
            <Link href="/safety" onClick={close}>Safety</Link>
            <Link href="/about" onClick={close}>About Sync</Link>
            {admin && <Link href="/admin" onClick={close}>Admin</Link>}
            <button type="button" onClick={() => { setOpen(false); setConfirming(true); }}>Log out</button>
          </div>
        )}
      </div>
      {confirming && (
        <div className="privacy-backdrop" onClick={() => setConfirming(false)}>
          <div className="card privacy-card" role="dialog" aria-labelledby="logout-title" onClick={(event) => event.stopPropagation()}>
            <h2 id="logout-title">Log out now?</h2>
            <form action={signOut}>
              <div className="row">
                <button className="btn secondary" type="button" onClick={() => setConfirming(false)}>Cancel</button>
                <button className="btn brand" type="submit">Log out</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
