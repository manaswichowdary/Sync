"use client";

import Link from "next/link";
import { useState } from "react";
import { SyncMark } from "@/components/SyncMark";

const links = [
  ["about", "About us"],
  ["help", "Help"],
  ["crunch", "Calendar"],
  ["gather", "Gather"],
  ["forum", "Discussion Forum"],
  ["rewards", "Rewards"],
] as const;

export function HomeNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="topbar home-bar">
      <a href="#top" className="logo" aria-label="Sync"><SyncMark /></a>
      <button
        className="menu-toggle"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Menu
      </button>
      <nav className={open ? "site-nav open" : "site-nav"}>
        {links.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>
        ))}
        <a className="nav-heart" href="#principles" aria-label="Humanity principles" onClick={() => setOpen(false)}>♥</a>
      </nav>
      <Link href="/login" className="btn">Log in / Sign up</Link>
    </header>
  );
}
