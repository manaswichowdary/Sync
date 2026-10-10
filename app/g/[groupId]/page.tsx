import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { signOut } from "@/app/actions";
import { ForecastPanel } from "@/components/ForecastPanel";
import { GatherPanel } from "@/components/GatherPanel";
import { GroupTools } from "@/components/GroupTools";
import { HelpPanel } from "@/components/HelpPanel";
import { UpdatesPanel } from "@/components/UpdatesPanel";
import { loadGroupPage } from "@/lib/data/load";

export const dynamic = "force-dynamic";

const sections = [
  { id: "help", title: "Help", text: "Ask for help or offer some.", mark: "♥" },
  { id: "forecast", title: "Calendar", text: "See a busy time before you ask.", mark: "◷" },
  { id: "gather", title: "Gather", text: "Plan a time with neighbors.", mark: "✦" },
  { id: "updates", title: "Updates", text: "Share a short note with the group.", mark: "✎" },
] as const;

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { groupId } = await params;
  const { tab } = await searchParams;
  const loaded = await loadGroupPage(groupId);
  if (loaded.status === "home") redirect("/");
  if (loaded.status === "setup") {
    return <div className="notice wrap page-pad">Add {loaded.missing.join(", ")} in .env.local.</div>;
  }
  if (loaded.status === "missing") notFound();
  const data = loaded.data;
  const active = tab === "forecast" || tab === "gather" || tab === "updates" || tab === "people" ? tab : "help";

  return (
    <div className="wrap group-page">
      <header className="topbar group-top">
        <Link href="/" className="logo">Sync</Link>
        <span className="spacer" />
        <details className="menu">
          <summary>Menu</summary>
          <div className="menu-panel">
            <Link href="/?view=home">Home</Link>
            <Link href={`/g/${groupId}?tab=people`}>Neighbors</Link>
            <Link href="/preferences">Preferences</Link>
            <Link href="/safety">Safety</Link>
            <form action={signOut}>
              <button type="submit">Log out</button>
            </form>
          </div>
        </details>
      </header>

      <div className="hi-banner">
        <p className="hi-line">Hi, {data.me.firstName}</p>
        <p>{data.group.name}</p>
      </div>
      <p className="lead">
        {data.group.neighborhood} · {data.group.purpose} · {data.group.memberCount} of {data.group.cap} neighbors
      </p>
      {data.otherGroups.length > 0 && (
        <p className="hint">
          Also in {data.otherGroups.map((group, index) => (
            <span key={group.id}>{index > 0 ? ", " : ""}<Link href={`/g/${group.id}`}>{group.name}</Link></span>
          ))}
        </p>
      )}
      {data.group.status === "paused" && (
        <div className="notice">This group is paused. A new post or a confirmed exchange turns it back on, and then its code works again.</div>
      )}
      {data.group.held && <div className="notice">This group is on hold after a report.</div>}
      {data.group.warnDays !== null && (
        <div className="notice">This group pauses in {data.group.warnDays} days if nobody posts or confirms an exchange.</div>
      )}
      {data.group.suggestSplit && (
        <div className="notice">This group is at the cap. Consider splitting into a second group.</div>
      )}
      {data.group.mergeNames.length > 0 && (
        <div className="notice">Most members also belong to {data.group.mergeNames.join(", ")}. Consider merging.</div>
      )}

      <div className="action-grid">
        {sections.map((section) => (
          <Link
            key={section.id}
            href={`/g/${groupId}?tab=${section.id}`}
            className={`action-card ${active === section.id ? "active" : ""}`}
          >
            <span className="mark" aria-hidden="true">{section.mark}</span>
            <span className="action-title">{section.title}</span>
            <span className="action-text">{section.text}</span>
          </Link>
        ))}
      </div>

      {active === "help" && <HelpPanel data={data} />}
      {active === "forecast" && <ForecastPanel data={data} />}
      {active === "gather" && <GatherPanel groupId={groupId} posts={data.posts.filter((post) => post.kind === "gather")} />}
      {active === "updates" && <UpdatesPanel groupId={groupId} posts={data.posts.filter((post) => post.kind === "update")} />}
      {active === "people" && (
        <section className="card">
          <h2>Neighbors</h2>
          {data.members.map((member) => (
            <p key={member.userId}>
              {member.firstName}
              {member.role === "creator" ? " · started this group" : ""}
              {member.badges.map((badge) => (
                <span key={badge} className="badge">{badge}</span>
              ))}
            </p>
          ))}
        </section>
      )}

      <GroupTools groupId={groupId} codes={data.codes} />
    </div>
  );
}
