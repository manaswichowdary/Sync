import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ForecastPanel } from "@/components/ForecastPanel";
import { GatherPanel } from "@/components/GatherPanel";
import { GroupMenu } from "@/components/GroupMenu";
import { HelpPanel } from "@/components/HelpPanel";
import { InviteCard } from "@/components/InviteCard";
import { RewardsPanel } from "@/components/RewardsPanel";
import { SyncMark } from "@/components/SyncMark";
import { UpdatesPanel } from "@/components/UpdatesPanel";
import { loadGroupPage } from "@/lib/data/load";
import type { GroupPageData } from "@/lib/viewTypes";

export const dynamic = "force-dynamic";

const tabs = [
  { id: "help", title: "Help", mark: "❤️" },
  { id: "forecast", title: "Calendar", mark: "⏰" },
  { id: "gather", title: "Gather", mark: "🤗" },
  { id: "updates", title: "Discussion Forum", mark: "📝" },
  { id: "rewards", title: "Rewards", mark: "⭐" },
] as const;

function dayName(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function NeighborRow({
  firstName,
  creator,
  badges,
}: {
  firstName: string;
  creator: boolean;
  badges: string[];
}) {
  const invite = badges.find((badge) => badge.startsWith("Invited by "));
  const rest = badges.filter((badge) => badge !== invite);
  const summary = creator ? "Started this group" : invite;
  const inside = creator && invite ? [invite, ...rest] : rest;
  return (
    <div className="neighbor-row">
      <p>{firstName}</p>
      {summary && (
        <details className="badge-drop">
          <summary>{summary}</summary>
          {inside.length > 0 && (
            <div className="badge-menu">
              {inside.map((badge) => (
                <span key={badge} className="badge">{badge}</span>
              ))}
            </div>
          )}
        </details>
      )}
    </div>
  );
}

function GettingStarted({ groupId, data }: { groupId: string; data: GroupPageData }) {
  const invited = data.codes.length > 0 || data.group.memberCount > 1;
  const posted = data.posts.some((post) => post.kind === "need");
  const free = data.freeTimes.length > 0;
  const steps = [
    { done: invited, label: "Invite a neighbor", href: "#invite" },
    { done: posted, label: "Post your first request", href: `/g/${groupId}?tab=help&start=request` },
    { done: free, label: "Say when you are free", href: `/g/${groupId}?tab=help&start=free` },
  ];
  return (
    <section className="card start-card">
      <h2>Getting started</h2>
      <ol className="start-list">
        {steps.map((step, index) => (
          <li key={step.label} className={step.done ? "done" : ""}>
            <span className="start-num" aria-hidden="true">{step.done ? "✓" : index + 1}</span>
            {step.done ? <span>{step.label}</span> : <Link className="btn" href={step.href}>{step.label}</Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ tab?: string; start?: string }>;
}) {
  const { groupId } = await params;
  const query = await searchParams;
  const loaded = await loadGroupPage(groupId);
  if (loaded.status === "home") redirect("/");
  if (loaded.status === "setup") {
    return <div className="notice wrap page-pad">Add {loaded.missing.join(", ")} in .env.local.</div>;
  }
  if (loaded.status === "missing") notFound();
  const data = loaded.data;
  const known = ["help", "forecast", "gather", "updates", "rewards", "people"] as const;
  const active = known.includes(query.tab as (typeof known)[number]) ? query.tab! : "help";
  const noRequests = !data.posts.some((post) => post.kind === "need");

  return (
    <div className="group-page">
      <header className="group-head">
        <Link href="/?view=home" className="logo" aria-label="Sync">
          <SyncMark />
        </Link>
        <GroupMenu groupId={groupId} />
      </header>

      <div className="group-shell">
        <div className="group-hero">
          <div className="hi-banner group-banner">
            <div>
              <p className="hi-line">Hi, {data.me.firstName}</p>
              <p className="group-name">{data.group.name}</p>
              <p className="pill-row">
                <span className="soft-pill">{data.group.neighborhood}</span>
                <span className="soft-pill">{data.group.memberCount} of {data.group.cap} neighbors</span>
              </p>
            </div>
          </div>
          <InviteCard codes={data.codes} />
        </div>

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

        {active !== "people" && (
          <nav className="tab-row" aria-label="Group sections">
            {tabs.map((item) => (
              <Link key={item.id} href={`/g/${groupId}?tab=${item.id}`} className={active === item.id ? "tab-pill on" : "tab-pill"}>
                <span className="tab-mark" aria-hidden="true">{item.mark}</span>
                <span className="tab-label">{item.title}</span>
              </Link>
            ))}
          </nav>
        )}

        <div className="group-columns">
          <div className="group-main">
            {active === "help" && noRequests && <GettingStarted groupId={groupId} data={data} />}
            {active === "help" && <HelpPanel data={data} start={query.start} hideEmpty={noRequests} />}
            {active === "forecast" && <ForecastPanel data={data} />}
            {active === "gather" && <GatherPanel groupId={groupId} posts={data.posts.filter((post) => post.kind === "gather")} />}
            {active === "updates" && <UpdatesPanel groupId={groupId} posts={data.posts.filter((post) => post.kind === "update")} />}
            {active === "rewards" && <RewardsPanel data={data} />}
            {active === "people" && (
              <section className="card">
                <h2>Neighbors</h2>
                {data.members.map((member) => (
                  <NeighborRow
                    key={member.userId}
                    firstName={member.firstName}
                    creator={member.role === "creator"}
                    badges={member.badges}
                  />
                ))}
              </section>
            )}
          </div>

          <aside className="group-side">
            <section className="card side-card">
              <h2>Neighbors</h2>
              {data.members.slice(0, 5).map((member) => (
                <NeighborRow
                  key={member.userId}
                  firstName={member.firstName}
                  creator={member.role === "creator"}
                  badges={member.badges}
                />
              ))}
              <Link href={`/g/${groupId}?tab=people`}>See all</Link>
            </section>
            <section className="card side-card">
              <h2>Help given this month</h2>
              <p>{data.group.helpThisMonth}</p>
              <p className="hint">A shared count with no names.</p>
            </section>
            <section className="card side-card">
              <h2>Free times</h2>
              {data.freeTimes.length === 0 && (
                <Link className="btn" href={`/g/${groupId}?tab=help&start=free`}>Add when you are free</Link>
              )}
              <div className="chip-row">
                {data.freeTimes.map((offer) => (
                  <span key={offer.id} className="soft-pill">
                    {offer.firstName} · {dayName(offer.weekday)} · {offer.start} to {offer.end}
                  </span>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
