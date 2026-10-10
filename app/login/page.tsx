import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForms } from "@/components/HomeForms";
import { loadHome } from "@/lib/data/load";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const query = await searchParams;
  const home = await loadHome();
  if (home.groupId) redirect(`/g/${home.groupId}`);

  return (
    <div className="login-wrap">
      <div className="login-stack">
        {home.missing.length > 0 && <div className="notice">Add {home.missing.join(", ")} in .env.local.</div>}
        {query.notice === "finish" && <div className="notice">Add your name, phone, and group code to finish joining.</div>}
        {query.error === "link" && <div className="notice">That login link did not work. Request a new one.</div>}
        <LoginForms />
        <p><Link href="/start">Don't have a code?</Link></p>
        <p className="hint">A wrong code saves nothing. Check your email for a link.</p>
      </div>
    </div>
  );
}
