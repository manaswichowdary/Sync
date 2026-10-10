"use client";

import Link from "next/link";
import { SyncMark } from "@/components/SyncMark";

export function PublicHeader({ signedIn = false, showInfo = true }: { signedIn?: boolean; showInfo?: boolean }) {
  return (
    <header className="topbar">
      <Link href="/" className="logo" aria-label="Sync"><SyncMark /></Link>
      <span className="spacer" />
      {showInfo && <Link href="/about" className="text-btn">Information</Link>}
      {signedIn ? (
        <Link href="/" className="btn brand">Your group</Link>
      ) : (
        <Link href="/login" className="btn brand">Log in / Sign up</Link>
      )}
    </header>
  );
}
