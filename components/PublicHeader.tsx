"use client";

import Link from "next/link";
import { SyncMark } from "@/components/SyncMark";

export function PublicHeader({ showInfo = true }: { showInfo?: boolean }) {
  return (
    <header className="topbar">
      <Link href="/" className="logo" aria-label="Sync"><SyncMark /></Link>
      <span className="spacer" />
      {showInfo && <Link href="/about" className="text-btn">Information</Link>}
      <Link href="/login" className="btn brand">Log in / Sign up</Link>
    </header>
  );
}
