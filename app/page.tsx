import Link from "next/link";
import { redirect } from "next/navigation";
import { DotField } from "@/components/DotField";
import { HomeNav } from "@/components/HomeNav";
import { SyncMark } from "@/components/SyncMark";
import { MemberHome } from "@/components/HomeForms";
import { principles } from "@/data/principles";
import { loadHome } from "@/lib/data/load";

export const dynamic = "force-dynamic";

const quotes = [
  "A small group is easier to trust.",
  "Ask a neighbor. Someone close can help.",
  "Parents need backup, not a crowd.",
  "Kindness works best when it stays near home.",
  "You can say yes, and you can say no.",
  "Trust grows one ride, one favor, one thank you.",
  "The people on your street already know the way.",
  "Help is lighter when you share it.",
  "A quiet group can still be a strong one.",
  "Community starts with one honest ask.",
];

function QuoteSet({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className={hidden ? "marquee-set marquee-copy" : "marquee-set"} aria-hidden={hidden || undefined}>
      {quotes.map((quote) => (
        <p key={`${hidden ? "b" : "a"}-${quote}`} className="quote-pill">{quote}</p>
      ))}
    </div>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string; view?: string }>;
}) {
  const query = await searchParams;
  const home = await loadHome();
  const seePublic = query.view === "home";
  if (home.groupId && !seePublic) redirect(`/g/${home.groupId}`);

  const notices = (
    <>
      {home.missing.length > 0 && <div className="notice">Add {home.missing.join(", ")} in .env.local.</div>}
      {query.notice === "finish" && (
        <div className="notice">Add your name, phone, and group code to finish joining.</div>
      )}
      {query.error === "link" && <div className="notice">That login code did not work. Request a new one.</div>}
    </>
  );

  if (home.user && !seePublic) {
    return (
      <div className="group-page">
        <div className="group-shell">
          {notices}
          {home.profile ? <MemberHome /> : (
            <p className="lead">Finish joining from the login page. <Link href="/login">Log in / Sign up</Link></p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="home" id="top">
      <DotField />
      <HomeNav />
      <div className="home-open">
      <section className="stage">
        <div className="hero-frame">
          <div className="hero-card card">
            {notices}
            <h1 className="stage-title">SYNC</h1>
            <p className="tagline">Parenting is easier with neighbors who have your back.</p>
            <p>Small groups. Real neighbors. You decide.</p>
            <Link href="/login" className="btn">Log in / Sign up</Link>
          </div>
          <img
            className="hero-photo"
            src="/scenes/hero.jpg"
            alt="Neighbors of many ages standing together on a sunny street"
          />
        </div>
      </section>

      <div className="marquee">
        <div className="marquee-track">
          <QuoteSet />
          <QuoteSet hidden />
        </div>
      </div>
      </div>

      <section className="band about-band" id="about">
        <div className="wrap about-copy">
          <div className="about-row">
            <div className="about-logo" aria-hidden="true"><SyncMark /></div>
            <div>
              <h2>About us</h2>
              <p>Parenting is hard to do alone, and most parents do not know who to ask when a pickup falls through or a schedule clashes. Asking a stranger online feels risky, and posting a child&apos;s name, school or address is a real safety concern.</p>
              <p>Sync is a free, invite only app where neighbors help each other with rides, pickups, borrowing and small gatherings. A parent writes or speaks a request, and our privacy guard catches kids&apos; names, schools and addresses before anything is shared. AI then helps reword the message so it is clear and kind, but the parent always reads it and approves it first.</p>
              <p>Requests are matched with neighbors who live within one mile and are free at the right time, and a calendar view spots busy times and suggests a request that is only sent when the parent taps Send. Any private details go only to the helper who confirms, and they are deleted 24 hours after both people mark the exchange done.</p>
              <p>Trust badges and private help counts recognize kindness without leaderboards, and reports pause a post right away. Sync helps neighbors show up for each other, and people always stay in charge.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band feature-band" id="features">
        <div className="wrap scene-grid">
          <div className="scene-item" id="help">
            <h2>Help</h2>
            <article className="card scene-card">
              <img src="/scenes/help.jpg" alt="Neighbors handing over a bag of groceries at a front door" />
              <div className="scene-body">
                <p>Ask for a ride, a pickup, or something to borrow.</p>
                <p className="hint">Dana needs a ride. Sam offered to help.</p>
              </div>
            </article>
          </div>

          <div className="scene-item" id="crunch">
            <h2>Calendar</h2>
            <article className="card scene-card">
              <img src="/scenes/calendar.jpg" alt="A school pickup with a parent, a grandparent, a child, and a teen" />
              <div className="scene-body">
                <p>See a busy time before you ask. Nothing is sent until you tap Send.</p>
                <p className="hint">Thursday 3:30 is busy. Dana offered Thursday 3 to 5.</p>
              </div>
            </article>
          </div>

          <div className="scene-item" id="gather">
            <h2>Gather</h2>
            <article className="card scene-card">
              <img src="/scenes/gather.jpg" alt="Adults with coffee on a porch while children play nearby" />
              <div className="scene-body">
                <p>Plan a coffee, a playdate, or a walk with people you already know.</p>
                <p className="hint">Saturday coffee. Dana and Sam are in.</p>
              </div>
            </article>
          </div>

          <div className="scene-item" id="forum">
            <h2>Discussion Forum</h2>
            <article className="card scene-card">
              <img src="/scenes/forum.jpg" alt="Neighbors talking beside a lobby door" />
              <div className="scene-body">
                <p>Share a short update. Each note expires after 7 days.</p>
                <p className="hint">The lobby door sticks. Give it a firm pull.</p>
              </div>
            </article>
          </div>

          <div className="scene-item" id="rewards">
            <h2>Rewards</h2>
            <article className="card scene-card">
              <img src="/scenes/rewards.jpg" alt="Two families sharing a thank you on the sidewalk" />
              <div className="scene-body">
                <p>Badges can say Invited by or Helped neighbors. There are no public scores.</p>
                <p className="hint">Invited by Sam. Helped neighbors.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="lower-band">
      <section className="band" id="decide">
        <div className="wrap">
          <h2>AI helps. You decide.</h2>
          <div className="cards">
            <article className="card">
              <h3>It cleans your post</h3>
              <p>Private details like names and schools are removed before anyone sees it.</p>
            </article>
            <article className="card">
              <h3>It suggests, never sends</h3>
              <p>Calendar shows a busy time and who offered. Nothing goes out until the parent taps Send.</p>
            </article>
            <article className="card">
              <h3>You approve every word</h3>
              <p>Voice and typed requests are shown to you first.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="cheer">
            <h2>Ask someone on your street.</h2>
            <p>A little help, right when you need it.</p>
            <Link href="/login" className="btn secondary">Log in / Sign up</Link>
          </div>
        </div>
      </section>
      </div>

      <section className="band principle-band" id="principles">
        <div className="wrap">
          <h2 className="principle-title"><span className="section-heart" aria-hidden="true">♥</span> Built on the 7 Humanity principles</h2>
          <div className="cards">
            {principles.map((item) => (
              <article key={item.title} className="card">
                <h3>{item.title}</h3>
                <p>{item.sync}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
