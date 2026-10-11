import Link from "next/link";
import { redirect } from "next/navigation";
import { DotField } from "@/components/DotField";
import { HomeNav } from "@/components/HomeNav";
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
      {query.error === "link" && <div className="notice">That login link did not work. Request a new one.</div>}
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
          <h2>About us</h2>
          <p>Sync is a small, invite only space where neighbors help each other with everyday parenting needs, like rides, pickups, borrowing, and plans for the weekend.</p>
          <p>Parents are busy, and the best backup is often a neighbor a few doors down. But asking strangers online does not feel safe, and big neighborhood apps can feel loud and public. Sync is built to be the opposite. There is no public feed, no likes, and no public profiles.</p>
          <p>You join with a code passed from one neighbor to another, so every group starts with people who already know each other. Groups stay small, and everyone nearby is within a mile.</p>
          <p>AI helps, but people decide. It removes private details, like a child&apos;s name or school, before anything is posted. It suggests who could help, but it never sends anything on its own. You approve every word, and the final call is always made by people, in person.</p>
          <p>Sync is built on the Humanity principles: compassion, empathy, forgiveness, integrity, kindness, respect, and reflection.</p>
        </div>
      </section>

      <section className="band feature-band">
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
