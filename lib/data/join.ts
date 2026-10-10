import { canAddGroup, codeUsable, isGroupFull, wrongCodeLocked } from "../groupRules";
import type { Db } from "./db";
import { from } from "./db";
import { normalizeCode } from "./codes";
import { memberCount, membershipStats, confirmedCount } from "./stats";

async function triesFor(db: Db, email: string): Promise<number> {
  const { data } = await from(db, "code_attempts").select("tries").eq("subject", email).maybeSingle();
  return data?.tries ?? 0;
}

async function setTries(db: Db, email: string, tries: number) {
  await from(db, "code_attempts").upsert({
    subject: email,
    tries,
    updated_at: new Date().toISOString(),
  });
}

export async function lookupCode(db: Db, raw: string, now = new Date()): Promise<
  | { ok: true; code: string; groupId: string; createdBy: string }
  | { ok: false; wrong: boolean; error: string }
> {
  const code = normalizeCode(raw);
  if (!code) return { ok: false, wrong: true, error: "That code is not valid." };
  const { data: invite } = await from(db, "invite_codes").select("*").eq("code", code).maybeSingle();
  if (!invite) return { ok: false, wrong: true, error: "That code is not valid." };
  const { data: group } = await from(db, "groups").select("*").eq("id", invite.group_id).maybeSingle();
  if (!group || group.removed) return { ok: false, wrong: true, error: "That code is not valid." };
  const usable = codeUsable({
    uses: invite.uses,
    maxUses: invite.max_uses,
    expiresAt: new Date(invite.expires_at),
    groupStatus: group.status,
    held: group.held,
    now,
  });
  if (!usable.ok) return { ok: false, wrong: false, error: usable.reason };
  return { ok: true, code, groupId: group.id, createdBy: invite.created_by };
}

export async function applyInviteCode(
  db: Db,
  userId: string,
  email: string,
  raw: string
): Promise<{ ok: true; groupId: string } | { ok: false; error: string }> {
  const tries = await triesFor(db, email);
  if (wrongCodeLocked(tries)) {
    return { ok: false, error: "Too many wrong codes. Ask a neighbor for help joining." };
  }
  const found = await lookupCode(db, raw);
  if (!found.ok) {
    if (found.wrong) await setTries(db, email, tries + 1);
    return { ok: false, error: found.error };
  }

  const { data: existing } = await from(db, "group_members")
    .select("user_id")
    .eq("group_id", found.groupId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) {
    await setTries(db, email, 0);
    return { ok: true, groupId: found.groupId };
  }

  const add = canAddGroup(await membershipStats(db, userId));
  if (!add.allowed) return { ok: false, error: add.reason };

  const full = isGroupFull(await memberCount(db, found.groupId), await confirmedCount(db, found.groupId));
  if (full) return { ok: false, error: "This group is full." };

  const { error } = await from(db, "group_members").insert({
    group_id: found.groupId,
    user_id: userId,
    role: "member",
    trust: "everyday",
    invited_by: found.createdBy,
  });
  if (error) return { ok: false, error: "Could not join this group." };

  const { data: invite } = await from(db, "invite_codes").select("uses").eq("code", found.code).maybeSingle();
  await from(db, "invite_codes").update({ uses: (invite?.uses ?? 0) + 1 }).eq("code", found.code);
  await setTries(db, email, 0);
  return { ok: true, groupId: found.groupId };
}

export async function assertCodeAvailable(db: Db, email: string, raw: string) {
  const tries = await triesFor(db, email);
  if (wrongCodeLocked(tries)) {
    return { ok: false as const, error: "Too many wrong codes. Ask a neighbor for help joining." };
  }
  const found = await lookupCode(db, raw);
  if (!found.ok) {
    if (found.wrong) await setTries(db, email, tries + 1);
    return { ok: false as const, error: found.error };
  }
  return { ok: true as const, code: found.code };
}
