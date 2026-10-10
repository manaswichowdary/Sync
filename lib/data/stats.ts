import { HANDOFF_DELETE_HOURS } from "../config";
import type { Db } from "./db";
import { from } from "./db";

export async function confirmedCount(db: Db, groupId: string): Promise<number> {
  const { data: posts } = await from(db, "posts").select("id").eq("group_id", groupId);
  const ids = (posts ?? []).map((post: { id: string }) => post.id);
  if (ids.length === 0) return 0;
  const { count } = await from(db, "exchanges")
    .select("id", { count: "exact", head: true })
    .in("post_id", ids)
    .not("completed_at", "is", null);
  return count ?? 0;
}

export async function memberCount(db: Db, groupId: string): Promise<number> {
  const { count } = await from(db, "group_members")
    .select("user_id", { count: "exact", head: true })
    .eq("group_id", groupId);
  return count ?? 0;
}

export async function membershipStats(db: Db, userId: string): Promise<{ confirmedExchanges: number }[]> {
  const { data } = await from(db, "group_members")
    .select("group_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true });
  const stats: { confirmedExchanges: number }[] = [];
  for (const row of data ?? []) {
    stats.push({ confirmedExchanges: await confirmedCount(db, row.group_id) });
  }
  return stats;
}

export async function touchActivity(db: Db, groupId: string) {
  const { data: group } = await from(db, "groups").select("held").eq("id", groupId).maybeSingle();
  const patch: { last_activity_at: string; status?: "active" } = {
    last_activity_at: new Date().toISOString(),
  };
  if (!group?.held) patch.status = "active";
  await from(db, "groups").update(patch).eq("id", groupId);
}

export function handoffExpires(completedAt: Date): string {
  return new Date(completedAt.getTime() + HANDOFF_DELETE_HOURS * 60 * 60 * 1000).toISOString();
}

export async function writableGroup(db: Db, groupId: string) {
  const { data } = await from(db, "groups").select("*").eq("id", groupId).maybeSingle();
  if (!data || data.removed) return { error: "This group is not available." as const };
  if (data.held) return { error: "This group is on hold." as const };
  return { group: data };
}

export async function requireMember(db: Db, groupId: string, userId: string) {
  const { data } = await from(db, "group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role ?? null;
}
