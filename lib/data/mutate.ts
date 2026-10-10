import { checkPost } from "../guard";
import type { ActionResult } from "../actionResult";
import { approvedText } from "../approveText";
import { packChild } from "../childDetails";
import { CODE_DEFAULT_MAX_USES } from "../config";
import { isAdminEmail } from "../admin";
import {
  canAddGroup,
  clampCodeDays,
  clampCodeMaxUses,
  codeExpiresAt,
  createCooldown,
  reviewNewGroup,
  updateExpiresAt,
  type GroupPurpose,
} from "../groupRules";
import { familyCodeWord } from "../codeWord";
import { validTimeRange } from "../forecast";
import { makeInviteCode } from "./codes";
import type { Db } from "./db";
import { from } from "./db";
import { applyInviteCode } from "./join";
import { confirmedCount, handoffExpires, memberCount, membershipStats, requireMember, touchActivity, writableGroup } from "./stats";

const PURPOSES: GroupPurpose[] = ["building", "school", "street", "other"];
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const TOPICS = ["road_block", "question", "heads_up"];

type User = { id: string; email: string };

function shown(approval: Extract<ReturnType<typeof approvedText>, { ok: false }>): ActionResult {
  return {
    ok: false,
    error: approval.error,
    safeText: approval.safeText,
    findings: approval.findings.map((finding) => ({ found: finding.found, why: finding.why })),
  };
}

async function memberOrError(db: Db, groupId: string, userId: string): Promise<ActionResult | null> {
  if (!(await requireMember(db, groupId, userId))) return { ok: false, error: "You are not in this group." };
  return null;
}

async function openGroup(db: Db, groupId: string, userId: string): Promise<ActionResult | null> {
  const missing = await memberOrError(db, groupId, userId);
  if (missing) return missing;
  const writable = await writableGroup(db, groupId);
  if ("error" in writable) return { ok: false, error: writable.error };
  return null;
}

export async function joinGroup(db: Db, user: User, code: string): Promise<ActionResult> {
  const { data: profile } = await from(db, "profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) return { ok: false, error: "Finish signup before joining a group." };
  const joined = await applyInviteCode(db, user.id, user.email, code);
  if (!joined.ok) return joined;
  return { ok: true, groupId: joined.groupId };
}

export async function createGroup(
  db: Db,
  user: User,
  input: { name: string; neighborhood: string; purpose: string; anyway: boolean }
): Promise<ActionResult> {
  const { data: profile } = await from(db, "profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) return { ok: false, error: "Finish signup before creating a group." };
  const name = input.name.trim().slice(0, 60);
  const neighborhood = input.neighborhood.trim().slice(0, 60);
  if (name.length < 2 || neighborhood.length < 2) {
    return { ok: false, error: "Enter a group name and a neighborhood name." };
  }
  if (!PURPOSES.includes(input.purpose as GroupPurpose)) return { ok: false, error: "Choose a purpose." };
  const place = checkPost(`${name}. ${neighborhood}`);
  if (place.findings.some((finding) => finding.type === "address" || finding.type === "phone" || finding.type === "email")) {
    return { ok: false, error: "Use a neighborhood name, not an address, phone, or email." };
  }
  const add = canAddGroup(await membershipStats(db, user.id));
  if (!add.allowed) return { ok: false, error: add.reason };
  const { data: last } = await from(db, "groups")
    .select("created_at")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const cool = createCooldown(last?.created_at ? new Date(last.created_at) : null, new Date());
  if (!cool.allowed) {
    const when = cool.availableAt?.toLocaleDateString() ?? "later";
    return { ok: false, error: `You can create another group on ${when}.` };
  }
  const existing = await comparableGroups(db);
  const review = reviewNewGroup(
    { name, neighborhood, purpose: input.purpose },
    existing
  );
  const reviewPayload = {
    allowCreateAnyway: review.allowCreateAnyway,
    message: review.message,
    names: review.similar.map((group) => group.name),
  };
  if (review.similar.length > 0 && !input.anyway) {
    return { ok: false, error: review.message, review: reviewPayload };
  }
  if (!review.allowCreateAnyway) return { ok: false, error: review.message, review: reviewPayload };

  const id = crypto.randomUUID();
  const { error } = await from(db, "groups").insert({
    id,
    name,
    neighborhood,
    purpose: input.purpose,
    creator_id: user.id,
    status: "active",
  });
  if (error) return { ok: false, error: "Could not create the group." };
  await from(db, "group_members").insert({
    group_id: id,
    user_id: user.id,
    role: "creator",
    trust: "everyday",
  });
  await insertCode(db, id, user.id, CODE_DEFAULT_MAX_USES, codeExpiresAt(new Date()).toISOString());
  return { ok: true, groupId: id };
}

async function comparableGroups(db: Db) {
  const { data } = await from(db, "groups").select("id, name, neighborhood, purpose").eq("removed", false);
  const groups = [];
  for (const group of data ?? []) {
    groups.push({
      id: group.id,
      name: group.name,
      neighborhood: group.neighborhood,
      purpose: group.purpose,
      memberCount: await memberCount(db, group.id),
      confirmedExchanges: await confirmedCount(db, group.id),
    });
  }
  return groups;
}

async function insertCode(db: Db, groupId: string, userId: string, maxUses: number, expiresAt: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = makeInviteCode();
    const { error } = await from(db, "invite_codes").insert({
      code,
      group_id: groupId,
      created_by: userId,
      max_uses: maxUses,
      uses: 0,
      expires_at: expiresAt,
    });
    if (!error) return code;
  }
  return null;
}

export async function createInvite(
  db: Db,
  user: User,
  input: { groupId: string; maxUses: number; days: number }
): Promise<ActionResult> {
  const blocked = await memberOrError(db, input.groupId, user.id);
  if (blocked) return blocked;
  const maxUses = clampCodeMaxUses(input.maxUses);
  const days = clampCodeDays(input.days);
  const code = await insertCode(db, input.groupId, user.id, maxUses, codeExpiresAt(new Date(), days).toISOString());
  if (!code) return { ok: false, error: "Could not make a code." };
  return { ok: true, message: `New code ready. ${code}` };
}

async function savePost(
  db: Db,
  user: User,
  input: { groupId: string; kind: "need" | "offer" | "gather" | "update"; topic: string | null; text: string; expiresAt: string | null }
): Promise<ActionResult & { postId?: string }> {
  const blocked = await openGroup(db, input.groupId, user.id);
  if (blocked) return blocked;
  const approval = approvedText(input.text);
  if (!approval.ok) return shown(approval);
  const { data, error } = await from(db, "posts")
    .insert({
      group_id: input.groupId,
      author_id: user.id,
      kind: input.kind,
      topic: input.topic,
      text: approval.text,
      expires_at: input.expiresAt,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Could not save that." };
  await touchActivity(db, input.groupId);
  return { ok: true, postId: data.id };
}

export async function createNeed(
  db: Db,
  user: User,
  input: { groupId: string; text: string; childName: string; childSchool: string }
): Promise<ActionResult> {
  const saved = await savePost(db, user, { groupId: input.groupId, kind: "need", topic: null, text: input.text, expiresAt: null });
  if (!saved.ok || !saved.postId) return saved;
  const details = packChild(input.childName, input.childSchool);
  if (details) await from(db, "need_private").insert({ post_id: saved.postId, child_details: details });
  return { ok: true };
}

export async function createOfferPost(db: Db, user: User, input: { groupId: string; text: string }): Promise<ActionResult> {
  return savePost(db, user, { groupId: input.groupId, kind: "offer", topic: null, text: input.text, expiresAt: null });
}

export async function createGather(db: Db, user: User, input: { groupId: string; text: string }): Promise<ActionResult> {
  return savePost(db, user, { groupId: input.groupId, kind: "gather", topic: null, text: input.text, expiresAt: null });
}

export async function createUpdate(
  db: Db,
  user: User,
  input: { groupId: string; topic: string; text: string }
): Promise<ActionResult> {
  if (!TOPICS.includes(input.topic)) return { ok: false, error: "Choose road block, question, or heads up." };
  return savePost(db, user, {
    groupId: input.groupId,
    kind: "update",
    topic: input.topic,
    text: input.text,
    expiresAt: updateExpiresAt(new Date()).toISOString(),
  });
}

export async function createReply(db: Db, user: User, input: { groupId: string; postId: string; text: string }): Promise<ActionResult> {
  const blocked = await openGroup(db, input.groupId, user.id);
  if (blocked) return blocked;
  const { data: post } = await from(db, "posts").select("id, kind, removed, held").eq("id", input.postId).eq("group_id", input.groupId).maybeSingle();
  if (!post || post.removed || post.kind !== "update") return { ok: false, error: "That update is not open for replies." };
  const approval = approvedText(input.text);
  if (!approval.ok) return shown(approval);
  const { error } = await from(db, "replies").insert({ post_id: post.id, author_id: user.id, text: approval.text });
  if (error) return { ok: false, error: "Could not save that reply." };
  await touchActivity(db, input.groupId);
  return { ok: true };
}

export async function createStandingOffer(
  db: Db,
  user: User,
  input: { groupId: string; weekday: string; start: string; end: string; note: string }
): Promise<ActionResult> {
  const blocked = await openGroup(db, input.groupId, user.id);
  if (blocked) return blocked;
  const weekday = input.weekday.toLowerCase();
  if (!WEEKDAYS.includes(weekday) || !validTimeRange(input.start, input.end)) {
    return { ok: false, error: "Choose a weekday and a start time before the end time." };
  }
  let note = "";
  if (input.note.trim()) {
    const approval = approvedText(input.note);
    if (!approval.ok) return shown(approval);
    note = approval.text;
  }
  const { error } = await from(db, "standing_offers").insert({
    group_id: input.groupId,
    user_id: user.id,
    weekday,
    start_time: input.start,
    end_time: input.end,
    note,
  });
  if (error) return { ok: false, error: "Could not save that free time." };
  await touchActivity(db, input.groupId);
  return { ok: true };
}

export async function offerHelp(db: Db, user: User, input: { groupId: string; postId: string }): Promise<ActionResult> {
  const blocked = await openGroup(db, input.groupId, user.id);
  if (blocked) return blocked;
  const { data: post } = await from(db, "posts").select("*").eq("id", input.postId).eq("group_id", input.groupId).maybeSingle();
  if (!post || post.removed || post.held || post.kind !== "need") return { ok: false, error: "That request is not open." };
  if (post.author_id === user.id) return { ok: false, error: "This is your own request." };
  const { data: existing } = await from(db, "exchanges").select("id").eq("post_id", post.id).eq("helper_id", user.id).maybeSingle();
  if (!existing) {
    const { error } = await from(db, "exchanges").insert({
      post_id: post.id,
      requester_id: post.author_id,
      helper_id: user.id,
    });
    if (error) return { ok: false, error: "Could not offer help." };
  }
  await touchActivity(db, input.groupId);
  return { ok: true };
}

export async function confirmHelper(db: Db, user: User, input: { groupId: string; exchangeId: string }): Promise<ActionResult> {
  const blocked = await memberOrError(db, input.groupId, user.id);
  if (blocked) return blocked;
  const exchange = await exchangeInGroup(db, input.groupId, input.exchangeId);
  if (!exchange) return { ok: false, error: "That offer was not found." };
  if (exchange.requester_id !== user.id) return { ok: false, error: "Only the person who asked can confirm a helper." };
  const { data: chosen } = await from(db, "exchanges").select("id").eq("post_id", exchange.post_id).eq("chosen", true).maybeSingle();
  if (chosen) return { ok: false, error: "A helper is already confirmed." };
  await from(db, "exchanges").update({ chosen: true }).eq("id", exchange.id);
  const { data: priv } = await from(db, "need_private").select("child_details").eq("post_id", exchange.post_id).maybeSingle();
  if (priv?.child_details) {
    await from(db, "handoffs").upsert({
      exchange_id: exchange.id,
      child_details: priv.child_details,
      code_word: familyCodeWord(),
      expires_at: null,
    });
    await from(db, "need_private").delete().eq("post_id", exchange.post_id);
  }
  await touchActivity(db, input.groupId);
  return { ok: true };
}

export async function markDone(db: Db, user: User, input: { groupId: string; exchangeId: string }): Promise<ActionResult> {
  const blocked = await memberOrError(db, input.groupId, user.id);
  if (blocked) return blocked;
  const exchange = await exchangeInGroup(db, input.groupId, input.exchangeId);
  if (!exchange || !exchange.chosen) return { ok: false, error: "Confirm one helper before tapping Done." };
  const side = exchange.requester_id === user.id ? "requester" : exchange.helper_id === user.id ? "helper" : null;
  if (!side) return { ok: false, error: "This exchange is not yours." };
  const requesterDone = side === "requester" ? true : exchange.requester_confirmed;
  const helperDone = side === "helper" ? true : exchange.helper_confirmed;
  const patch: Record<string, unknown> = {
    requester_confirmed: requesterDone,
    helper_confirmed: helperDone,
  };
  if (requesterDone && helperDone && !exchange.completed_at) {
    const completed = new Date();
    patch.completed_at = completed.toISOString();
    await from(db, "handoffs").update({ expires_at: handoffExpires(completed) }).eq("exchange_id", exchange.id);
    await from(db, "badges").upsert(
      { user_id: exchange.helper_id, badge: "helped_neighbors", earned_at: completed.toISOString() },
      { onConflict: "user_id,badge", ignoreDuplicates: true }
    );
  }
  await from(db, "exchanges").update(patch).eq("id", exchange.id);
  await touchActivity(db, input.groupId);
  return { ok: true };
}

export async function sendThanks(
  db: Db,
  user: User,
  input: { groupId: string; exchangeId: string; note: string; recommend: boolean }
): Promise<ActionResult> {
  const blocked = await memberOrError(db, input.groupId, user.id);
  if (blocked) return blocked;
  const exchange = await exchangeInGroup(db, input.groupId, input.exchangeId);
  if (!exchange?.completed_at) return { ok: false, error: "Both people tap Done before a thank you." };
  const side = exchange.requester_id === user.id ? "requester" : exchange.helper_id === user.id ? "helper" : null;
  if (!side) return { ok: false, error: "This exchange is not yours." };
  const patch: Record<string, unknown> = {};
  if (input.note.trim()) {
    const approval = approvedText(input.note);
    if (!approval.ok) return shown(approval);
    patch.thank_you = approval.text;
  }
  if (input.recommend) {
    patch[side === "requester" ? "requester_recommends" : "helper_recommends"] = true;
  }
  if (Object.keys(patch).length === 0) return { ok: false, error: "Write a thank you or choose to recommend." };
  await from(db, "exchanges").update(patch).eq("id", exchange.id);
  if (input.recommend) {
    const other = side === "requester" ? exchange.helper_id : exchange.requester_id;
    await from(db, "badges").upsert(
      { user_id: other, badge: "recommended", earned_at: new Date().toISOString() },
      { onConflict: "user_id,badge", ignoreDuplicates: true }
    );
  }
  return { ok: true };
}

async function exchangeInGroup(db: Db, groupId: string, exchangeId: string) {
  const { data: exchange } = await from(db, "exchanges").select("*").eq("id", exchangeId).maybeSingle();
  if (!exchange) return null;
  const { data: post } = await from(db, "posts").select("group_id").eq("id", exchange.post_id).maybeSingle();
  if (!post || post.group_id !== groupId) return null;
  return exchange;
}

export async function setThreadFlag(
  db: Db,
  user: User,
  input: { groupId: string; postId: string; flag: "mute" | "leave" | "unmute" | "rejoin" }
): Promise<ActionResult> {
  const blocked = await memberOrError(db, input.groupId, user.id);
  if (blocked) return blocked;
  const { data: post } = await from(db, "posts").select("id").eq("id", input.postId).eq("group_id", input.groupId).maybeSingle();
  if (!post) return { ok: false, error: "That post was not found." };
  const { data: pref } = await from(db, "thread_prefs").select("*").eq("user_id", user.id).eq("post_id", post.id).maybeSingle();
  const muted = input.flag === "mute" ? true : input.flag === "unmute" ? false : Boolean(pref?.muted);
  const left = input.flag === "leave" ? true : input.flag === "rejoin" ? false : Boolean(pref?.left_thread);
  await from(db, "thread_prefs").upsert({
    user_id: user.id,
    post_id: post.id,
    muted,
    left_thread: left,
  });
  return { ok: true };
}

export async function savePrefs(
  db: Db,
  user: User,
  input: { help: boolean; gather: boolean; updates: boolean }
): Promise<ActionResult> {
  const { error } = await from(db, "profiles")
    .update({ hear_help: input.help, hear_gather: input.gather, hear_updates: input.updates })
    .eq("id", user.id);
  if (error) return { ok: false, error: "Could not save those choices." };
  return { ok: true };
}

export async function toggleRsvp(db: Db, user: User, input: { groupId: string; postId: string }): Promise<ActionResult> {
  const blocked = await openGroup(db, input.groupId, user.id);
  if (blocked) return blocked;
  const { data: post } = await from(db, "posts").select("id, kind, removed, held").eq("id", input.postId).eq("group_id", input.groupId).maybeSingle();
  if (!post || post.removed || post.held || post.kind !== "gather") return { ok: false, error: "That gathering is not open." };
  const { data: existing } = await from(db, "gather_rsvps").select("user_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle();
  if (existing) await from(db, "gather_rsvps").delete().eq("post_id", post.id).eq("user_id", user.id);
  else await from(db, "gather_rsvps").insert({ post_id: post.id, user_id: user.id });
  await touchActivity(db, input.groupId);
  return { ok: true };
}

export async function reportItem(
  db: Db,
  user: User,
  input: { groupId: string; targetType: string; targetId: string; reason: string }
): Promise<ActionResult> {
  const blocked = await memberOrError(db, input.groupId, user.id);
  if (blocked) return blocked;
  const reason = input.reason.trim().slice(0, 500);
  if (!reason) return { ok: false, error: "Add a short reason." };
  if (!["post", "reply", "group"].includes(input.targetType)) return { ok: false, error: "That cannot be reported." };
  if (input.targetType === "group" && input.targetId !== input.groupId) return { ok: false, error: "That group was not found." };
  if (input.targetType === "post") {
    const { data: post } = await from(db, "posts").select("id").eq("id", input.targetId).eq("group_id", input.groupId).maybeSingle();
    if (!post) return { ok: false, error: "That post was not found." };
    await from(db, "posts").update({ held: true }).eq("id", post.id);
  } else if (input.targetType === "reply") {
    const { data: reply } = await from(db, "replies").select("id, post_id").eq("id", input.targetId).maybeSingle();
    if (!reply) return { ok: false, error: "That reply was not found." };
    const { data: post } = await from(db, "posts").select("group_id").eq("id", reply.post_id).maybeSingle();
    if (!post || post.group_id !== input.groupId) return { ok: false, error: "That reply was not found." };
    await from(db, "replies").update({ held: true }).eq("id", reply.id);
  } else {
    await from(db, "groups").update({ held: true }).eq("id", input.groupId);
  }
  await from(db, "reports").insert({
    target_type: input.targetType,
    target_id: input.targetId,
    reporter_id: user.id,
    reason,
    status: "open",
  });
  return { ok: true, message: "Reported. It is on hold." };
}

export async function sendForecastRequest(db: Db, user: User, input: { groupId: string; summary: string }): Promise<ActionResult> {
  return createNeed(db, user, { groupId: input.groupId, text: input.summary, childName: "", childSchool: "" });
}

export async function moderateReport(
  db: Db,
  user: User,
  input: { reportId: string; action: "restore" | "remove" }
): Promise<ActionResult> {
  if (!isAdminEmail(user.email)) return { ok: false, error: "This page is limited to admin emails." };
  const { data: report } = await from(db, "reports").select("*").eq("id", input.reportId).maybeSingle();
  if (!report) return { ok: false, error: "That report was not found." };
  const removed = input.action === "remove";
  if (report.target_type === "post") {
    await from(db, "posts").update(removed ? { removed: true, held: true } : { held: false }).eq("id", report.target_id);
  } else if (report.target_type === "reply") {
    await from(db, "replies").update(removed ? { removed: true, held: true } : { held: false }).eq("id", report.target_id);
  } else if (report.target_type === "group") {
    await from(db, "groups").update(removed ? { removed: true, held: true } : { held: false }).eq("id", report.target_id);
  }
  await from(db, "reports").update({ status: removed ? "removed" : "restored" }).eq("id", report.id);
  return { ok: true };
}
