// TEAMMATE FILE: display only. Takes a post, shows it. Do not add data logic here.
import type { Post } from "@/lib/types";
import { timeLabel } from "@/lib/matching";
import { BoardPill, TrustBadge } from "./Badge";
import StreetControls from "./StreetControls";

export default function PostCard({ post }: { post: Post }) {
  const isStreet = post.board === "street";

  return (
    <article className="card">
      <div>
        <BoardPill board={post.board} />
        {!isStreet && <TrustBadge post={post} />}
      </div>

      <p>{post.text}</p>

      <div className="meta">
        {isStreet ? post.area : `${post.authorFirstName}, ${post.area}`}
        {!isStreet && post.times.length > 0 && ` · Free ${post.times.map(timeLabel).join(", ")}`}
        {!isStreet && post.publicOnly && " · Public places only"}
      </div>

      {isStreet ? (
        <StreetControls
          confirmations={post.confirmations ?? 0}
          minutesAgo={post.lastConfirmedMinutesAgo ?? 0}
        />
      ) : (
        <div className="row">
          <button className="btn secondary" disabled title="Chat is the next build step">
            Say hi in chat
          </button>
        </div>
      )}
    </article>
  );
}
