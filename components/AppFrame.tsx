"use client";

import { usePathname } from "next/navigation";
import { PublicHeader } from "./PublicHeader";

export function AppFrame({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const ownHeader = path === "/" || path.startsWith("/g/");
  return (
    <>
      {!ownHeader && <PublicHeader signedIn={signedIn} showInfo={path !== "/login" && path !== "/start"} />}
      {children}
    </>
  );
}
