import Link from "next/link";
import { FounderForm, NewGroupForm } from "@/components/StartFlow";
import { loadHome } from "@/lib/data/load";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const home = await loadHome();
  return (
    <div className="login-wrap">
      <div className="login-stack">
        <h1>Don&apos;t have a code?</h1>
        <p>Sync is invite only.</p>
        <p>A code comes from a neighbor or from a flyer in the neighborhood.</p>
        <p><a href="#new">Start a new group</a> if you do not have a neighbor yet.</p>
        {home.missing.length > 0 && <div className="notice">Add {home.missing.join(", ")} in .env.local.</div>}
        {home.user && home.profile ? <NewGroupForm /> : <FounderForm />}
        <p className="back-home"><Link href="/">Back to home</Link></p>
      </div>
    </div>
  );
}
