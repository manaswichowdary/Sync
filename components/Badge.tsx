// TEAMMATE FILE: display only. Do not add logic here.
import type { Post } from "@/lib/types";

export function TrustBadge({ post }: { post: Post }) {
  let label = "New";
  if (post.trust === "invited") label = `Invited by ${post.invitedBy ?? "a neighbor"}`;
  if (post.trust === "met") label = `Met ${post.metCount} neighbors`;

  return (
    <span className="badge" title="This is not a background check.">
      {label}
    </span>
  );
}

export function BoardPill({ board }: { board: Post["board"] }) {
  const names = { help: "Help", share: "Share", gather: "Gather", street: "Street update" };
  return <span className={`pill ${board}`}>{names[board]}</span>;
}
