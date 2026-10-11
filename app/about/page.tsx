import { principles } from "@/data/principles";

export default function AboutPage() {
  return (
    <div className="center-copy">
      <h1>Information</h1>
      <p className="lead">Seven ways Sync tries to be human.</p>
      <div className="stack">
        {principles.map((item) => (
          <article key={item.title} className="card">
            <h2>{item.title}</h2>
            <p>{item.official}</p>
            <p>{item.sync} {item.detail}</p>
          </article>
        ))}
        <article className="card">
          <h2>How AI helps, and people decide</h2>
          <ul className="plain-list">
            <li>The privacy check removes private details before posting.</li>
            <li>The voice option turns speech into text you approve.</li>
            <li>Calendar only suggests and never sends anything until the parent taps Send.</li>
          </ul>
        </article>
      </div>
    </div>
  );
}
