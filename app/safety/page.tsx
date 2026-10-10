export default function Safety() {
  return (
    <>
      <h1>How we build trust, one step at a time</h1>
      <p className="lead">
        We do not run background checks. Neighbors build trust in steps, and the final call is
        always made in person.
      </p>

      <div className="grid">
        <section className="card">
          <h2>1. Join through someone you know</h2>
          <p>
            A neighbor invites you with a code. Your badge says who invited you. If someone they
            invited is removed, their own invite privileges can be reviewed.
          </p>
        </section>
        <section className="card">
          <h2>2. Keep private details private</h2>
          <p>
            Phone numbers stay hidden from the group. A parent can share a phone with the one helper
            they confirm. Exact addresses are not part of a post.
          </p>
        </section>
        <section className="card">
          <h2>3. Optional call</h2>
          <p>A short video or voice call can happen later, and either person can say no.</p>
        </section>
        <section className="card">
          <h2>4. Meet in a public place</h2>
          <p>Meet in public, in daylight when you can. Both people tap Done after the help is finished.</p>
        </section>
        <section className="card">
          <h2>What the badges mean</h2>
          <p>
            <strong>Invited by</strong> a first name means that neighbor shared a code.{" "}
            <strong>Helped neighbors</strong> means they finished at least one confirmed exchange.{" "}
            <strong>Recommended by N neighbors</strong> means that many people finished an exchange
            with them and chose to recommend them. These are not background checks, counts of help,
            or stars.
          </p>
        </section>
        <section className="card">
          <h2>Limits you should know about</h2>
          <p>
            The privacy check can miss things, and an invite only helps if someone knows the person
            they invite. That is why meetups stay public and every post has a report button. In an
            emergency call 911. For emotional support call or text 988. For local help call 211.
          </p>
        </section>
      </div>
    </>
  );
}
