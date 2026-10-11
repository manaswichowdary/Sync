"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AppHeader } from "./AppHeader";
import { PublicHeader } from "./PublicHeader";

function FrameChrome({
  signedIn,
  groupId,
  admin,
}: {
  signedIn: boolean;
  groupId: string | null;
  admin: boolean;
}) {
  const path = usePathname();
  const params = useSearchParams();
  const publicHome = path === "/" && (!signedIn || params.get("view") === "home");
  if (publicHome) return null;
  if (signedIn) return <AppHeader groupId={groupId} admin={admin} />;
  const showInfo = path !== "/login" && path !== "/start" && path !== "/preferences" && path !== "/safety";
  return <PublicHeader showInfo={showInfo} />;
}

export function AppFrame({
  signedIn,
  groupId,
  admin,
  children,
}: {
  signedIn: boolean;
  groupId: string | null;
  admin: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <FrameChrome signedIn={signedIn} groupId={groupId} admin={admin} />
      </Suspense>
      {children}
    </>
  );
}
