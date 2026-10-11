import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { approvedText } from "../lib/approveText";
import { CODE_DEFAULT_MAX_USES } from "../lib/config";
import { codeExpiresAt, updateExpiresAt } from "../lib/groupRules";
import { missingSupabaseEnv } from "../lib/supabase/env";

const GROUP_NAME = "Maple Court Neighbors";
const NEIGHBORHOOD = "Maple Court";
const PURPOSE = "Pickups, rides, and borrowing";
const CODE = "SYNC-DEMO";

const PEOPLE = [
  { firstName: "Dana", email: "dana.ellis@example.com", phone: "5550100142", role: "creator" as const },
  { firstName: "Sam", email: "sam.ortiz@example.com", phone: "5550100198", role: "member" as const },
  { firstName: "Priya", email: "priya.nair@example.com", phone: "5550100214", role: "member" as const },
  { firstName: "Marcus", email: "marcus.bell@example.com", phone: "5550100266", role: "member" as const },
];

const POSTS = [
  { key: "ride", email: "dana.ellis@example.com", kind: "need", topic: null, text: "Ride home after school on Thursday" },
  { key: "table", email: "priya.nair@example.com", kind: "need", topic: null, text: "Borrow a folding table for Saturday" },
  { key: "park", email: "marcus.bell@example.com", kind: "need", topic: null, text: "Pickup from the park on Friday" },
  { key: "monday", email: "sam.ortiz@example.com", kind: "offer", topic: null, text: "Can do Monday pickups" },
  { key: "stroller", email: "priya.nair@example.com", kind: "offer", topic: null, text: "Happy to lend a stroller" },
  { key: "playdate", email: "dana.ellis@example.com", kind: "gather", topic: null, text: "Playdate at Maple Court Park on Saturday, 10 AM." },
  { key: "potluck", email: "sam.ortiz@example.com", kind: "gather", topic: null, text: "Sunday neighborhood potluck. Sunday 5:00 PM in the community room." },
  { key: "walk", email: "marcus.bell@example.com", kind: "gather", topic: null, text: "Walk to school together. Wednesday 7:45 AM at the front gate." },
  { key: "welcome", email: "dana.ellis@example.com", kind: "update", topic: "heads_up", text: "Welcome to Maple Court Neighbors! Say hi here." },
  { key: "dentist", email: "priya.nair@example.com", kind: "update", topic: "question", text: "Anyone know a good pediatric dentist nearby?" },
  { key: "cleaning", email: "marcus.bell@example.com", kind: "update", topic: "heads_up", text: "Reminder: street cleaning is Tuesday morning, please move cars." },
  { key: "thanks", email: "sam.ortiz@example.com", kind: "update", topic: "heads_up", text: "Thanks to everyone who helped with pickups this week." },
];

const RETIRED_TEXTS = [
  "Saturday coffee on the corner",
  "Playdate at the park, ages 5 to 8",
  "Sunday toy swap",
  "Maple Ave closed Tuesday for water work",
  "Know a good family dentist nearby?",
  "The lobby door sticks, pull firmly",
];

const REPLIES = [
  { post: "dentist", email: "dana.ellis@example.com", text: "The clinic near the market is gentle with families." },
  { post: "dentist", email: "sam.ortiz@example.com", text: "The community center keeps a short list of dentists." },
];

const FREE_TIMES = [
  { email: "dana.ellis@example.com", weekday: "thursday", start: "15:00", end: "17:00", note: "Thursday afternoon" },
  { email: "sam.ortiz@example.com", weekday: "saturday", start: "09:00", end: "12:00", note: "Saturday morning" },
];

function loadEnvFile() {
  let text = "";
  try {
    text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const name = trimmed.slice(0, eq).trim();
    if (!/^[A-Z0-9_]+$/.test(name)) continue;
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[name] === undefined) process.env[name] = value;
  }
}

function publicError(error: { message?: string; code?: string } | null): string {
  const message = error?.message ?? "Supabase rejected the request.";
  if (/eyJ[A-Za-z0-9_-]{8,}/.test(message) || /service[_ ]role|anon|api[_ ]?key/i.test(message)) {
    return "Supabase rejected the request.";
  }
  return message.slice(0, 240);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function rows(db: SupabaseClient) {
  return (name: string) => (db as unknown as { from: (table: string) => any }).from(name);
}

async function findAuthId(db: SupabaseClient, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const listed = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) fail(publicError(listed.error));
    const found = listed.data.users.find((user) => user.email?.toLowerCase() === target);
    if (found) return found.id;
    if (listed.data.users.length < 200) break;
  }
  return null;
}

async function userId(db: SupabaseClient, email: string, firstName: string): Promise<string> {
  const created = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });
  if (created.data.user?.id) return created.data.user.id;
  const existing = await findAuthId(db, email);
  if (existing) return existing;
  fail("Could not create a demo member.");
}

async function main() {
  loadEnvFile();
  const missing = missingSupabaseEnv().filter((name) => name !== "SUPABASE_ANON_KEY");
  if (missing.length) fail(`Add ${missing.join(", ")} in .env.local.`);

  const ready = POSTS.map((post) => {
    const approval = approvedText(post.text);
    if (!approval.ok) fail("A sample post did not pass the Kid Privacy Guard.");
    return { ...post, text: approval.text };
  });
  const readyReplies = REPLIES.map((reply) => {
    const approval = approvedText(reply.text);
    if (!approval.ok) fail("A sample reply did not pass the Kid Privacy Guard.");
    return { ...reply, text: approval.text };
  });

  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const from = rows(db);
  const ids = new Map<string, string>();

  for (const person of PEOPLE) {
    const id = await userId(db, person.email, person.firstName);
    ids.set(person.email, id);
    const existing = await from("profiles").select("id").eq("id", id).maybeSingle();
    if (existing.error) fail(publicError(existing.error));
    if (!existing.data) {
      const inserted = await from("profiles").insert({
        id,
        first_name: person.firstName,
        email: person.email,
        phone: person.phone,
        created_via_code: person.role === "member" ? CODE : null,
      });
      if (inserted.error) fail(publicError(inserted.error));
    }
  }

  const danaId = ids.get("dana.ellis@example.com") as string;
  const meEmail = process.env.SEED_ME_EMAIL?.trim();
  let meId: string | null = null;
  if (meEmail) {
    meId = await findAuthId(db, meEmail);
    if (!meId) fail("SEED_ME_EMAIL is not signed up yet.");
  }

  const namedGroups = await from("groups").select("id").eq("name", GROUP_NAME).eq("removed", false);
  if (namedGroups.error) fail(publicError(namedGroups.error));
  const namedIds = (namedGroups.data ?? []).map((group: { id: string }) => group.id as string);

  let groupId: string | undefined;
  if (meId && namedIds.length) {
    const mine = await from("group_members").select("group_id").eq("user_id", meId).in("group_id", namedIds);
    if (mine.error) fail(publicError(mine.error));
    groupId = mine.data?.[0]?.group_id as string | undefined;
  }
  if (!groupId) {
    const holder = await from("invite_codes").select("group_id").eq("code", CODE).maybeSingle();
    if (holder.error) fail(publicError(holder.error));
    if (holder.data && namedIds.includes(holder.data.group_id)) groupId = holder.data.group_id as string;
  }
  if (!groupId) groupId = namedIds[0];

  if (!groupId) {
    groupId = crypto.randomUUID();
    const inserted = await from("groups").insert({
      id: groupId,
      name: GROUP_NAME,
      neighborhood: NEIGHBORHOOD,
      purpose: PURPOSE,
      creator_id: danaId,
      status: "active",
      last_activity_at: new Date().toISOString(),
    });
    if (inserted.error) {
      if (inserted.error.code === "23514") {
        fail(
          "The groups.purpose check rejected the demo purpose. In the Supabase SQL editor, run: alter table groups drop constraint if exists groups_purpose_check; alter table groups add constraint groups_purpose_check check (char_length(trim(purpose)) > 0);"
        );
      }
      fail(publicError(inserted.error));
    }
  } else {
    await from("groups").update({
      neighborhood: NEIGHBORHOOD,
      purpose: PURPOSE,
      status: "active",
      last_activity_at: new Date().toISOString(),
    }).eq("id", groupId);
  }

  for (const otherId of namedIds) {
    if (otherId === groupId) continue;
    if (meId) {
      const belongs = await from("group_members").select("user_id").eq("group_id", otherId).eq("user_id", meId).maybeSingle();
      if (belongs.error) fail(publicError(belongs.error));
      if (belongs.data) continue;
    }
    const moved = await from("invite_codes").update({ group_id: groupId }).eq("group_id", otherId);
    if (moved.error) fail(publicError(moved.error));
    const removed = await from("groups").delete().eq("id", otherId).eq("name", GROUP_NAME);
    if (removed.error) fail(publicError(removed.error));
  }

  for (const person of PEOPLE) {
    const userIdForPerson = ids.get(person.email) as string;
    const member = await from("group_members")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("user_id", userIdForPerson)
      .maybeSingle();
    if (member.error) fail(publicError(member.error));
    if (member.data) continue;
    const inserted = await from("group_members").insert({
      group_id: groupId,
      user_id: userIdForPerson,
      role: person.role,
      trust: "everyday",
      invited_by: person.role === "member" ? danaId : null,
    });
    if (inserted.error) fail(publicError(inserted.error));
  }

  if (meId) {
    const profile = await from("profiles").select("id").eq("id", meId).maybeSingle();
    if (profile.error) fail(publicError(profile.error));
    if (!profile.data) {
      const inserted = await from("profiles").insert({
        id: meId,
        first_name: "Neighbor",
        email: meEmail,
        phone: "5550100000",
        created_via_code: CODE,
      });
      if (inserted.error) fail(publicError(inserted.error));
    }
    const member = await from("group_members").select("user_id").eq("group_id", groupId).eq("user_id", meId).maybeSingle();
    if (member.error) fail(publicError(member.error));
    if (!member.data) {
      const inserted = await from("group_members").insert({
        group_id: groupId,
        user_id: meId,
        role: "member",
        trust: "everyday",
        invited_by: danaId,
      });
      if (inserted.error) fail(publicError(inserted.error));
    }
  }

  const foundCode = await from("invite_codes").select("code, group_id, uses").eq("code", CODE).maybeSingle();
  if (foundCode.error) fail(publicError(foundCode.error));
  if (foundCode.data && foundCode.data.group_id !== groupId) {
    const owner = await from("groups").select("name").eq("id", foundCode.data.group_id).maybeSingle();
    if (owner.error) fail(publicError(owner.error));
    if (owner.data?.name !== GROUP_NAME) fail("Could not attach the demo code.");
    const moved = await from("invite_codes").update({ group_id: groupId }).eq("code", CODE);
    if (moved.error) fail(publicError(moved.error));
  }
  const uses = Number(foundCode.data?.uses ?? 0);
  const codeFields = {
    group_id: groupId,
    created_by: danaId,
    max_uses: Math.max(CODE_DEFAULT_MAX_USES, uses + 5),
    expires_at: codeExpiresAt(new Date(), 30).toISOString(),
  };
  if (foundCode.data) {
    const updated = await from("invite_codes").update(codeFields).eq("code", CODE);
    if (updated.error) fail(publicError(updated.error));
  } else {
    const inserted = await from("invite_codes").insert({ code: CODE, uses: 0, ...codeFields });
    if (inserted.error) fail(publicError(inserted.error));
  }
  const extraCodes = await from("invite_codes").select("code").eq("group_id", groupId).neq("code", CODE);
  if (extraCodes.error) fail(publicError(extraCodes.error));
  for (const extra of extraCodes.data ?? []) {
    const removed = await from("invite_codes").delete().eq("code", extra.code).eq("group_id", groupId);
    if (removed.error) fail(publicError(removed.error));
  }

  for (const text of RETIRED_TEXTS) {
    const removed = await from("posts").delete().eq("group_id", groupId).eq("text", text);
    if (removed.error) fail(publicError(removed.error));
  }

  const postIds = new Map<string, string>();
  for (const post of ready) {
    const existing = await from("posts")
      .select("id")
      .eq("group_id", groupId)
      .eq("text", post.text)
      .eq("removed", false)
      .limit(1)
      .maybeSingle();
    if (existing.error) fail(publicError(existing.error));
    if (existing.data?.id) {
      postIds.set(post.key, existing.data.id);
      if (post.kind === "update") {
        const refreshed = await from("posts").update({
          expires_at: updateExpiresAt(new Date()).toISOString(),
          topic: post.topic,
        }).eq("id", existing.data.id);
        if (refreshed.error) fail(publicError(refreshed.error));
      }
      continue;
    }
    const inserted = await from("posts").insert({
      group_id: groupId,
      author_id: ids.get(post.email),
      kind: post.kind,
      topic: post.topic,
      text: post.text,
      expires_at: post.kind === "update" ? updateExpiresAt(new Date()).toISOString() : null,
    }).select("id").single();
    if (inserted.error || !inserted.data) fail(publicError(inserted.error));
    postIds.set(post.key, inserted.data.id);
  }

  for (const reply of readyReplies) {
    const postId = postIds.get(reply.post);
    if (!postId) continue;
    const existing = await from("replies").select("id").eq("post_id", postId).eq("text", reply.text).limit(1).maybeSingle();
    if (existing.error) fail(publicError(existing.error));
    if (existing.data) continue;
    const inserted = await from("replies").insert({
      post_id: postId,
      author_id: ids.get(reply.email),
      text: reply.text,
    });
    if (inserted.error) fail(publicError(inserted.error));
  }

  const gatherings: { key: string; emails: string[] }[] = [
    { key: "playdate", emails: ["dana.ellis@example.com", "sam.ortiz@example.com", "priya.nair@example.com"] },
    { key: "potluck", emails: ["dana.ellis@example.com", "priya.nair@example.com", "marcus.bell@example.com", ...(meEmail ? [meEmail] : [])] },
    { key: "walk", emails: ["sam.ortiz@example.com", "priya.nair@example.com", "marcus.bell@example.com"] },
  ];
  for (const gathering of gatherings) {
    const postId = postIds.get(gathering.key);
    if (!postId) continue;
    for (const email of gathering.emails) {
      const user = email === meEmail ? meId : ids.get(email);
      if (!user) continue;
      const existing = await from("gather_rsvps").select("user_id").eq("post_id", postId).eq("user_id", user).maybeSingle();
      if (existing.error) fail(publicError(existing.error));
      if (existing.data) continue;
      const inserted = await from("gather_rsvps").insert({ post_id: postId, user_id: user });
      if (inserted.error) fail(publicError(inserted.error));
    }
  }

  for (const offer of FREE_TIMES) {
    const user = ids.get(offer.email);
    const existing = await from("standing_offers")
      .select("id")
      .eq("group_id", groupId)
      .eq("user_id", user)
      .eq("weekday", offer.weekday)
      .eq("start_time", offer.start)
      .limit(1)
      .maybeSingle();
    if (existing.error) fail(publicError(existing.error));
    if (existing.data) continue;
    const inserted = await from("standing_offers").insert({
      group_id: groupId,
      user_id: user,
      weekday: offer.weekday,
      start_time: offer.start,
      end_time: offer.end,
      note: offer.note,
    });
    if (inserted.error) fail(publicError(inserted.error));
  }

  const now = new Date().toISOString();
  const samId = ids.get("sam.ortiz@example.com") as string;
  const offered = await ensureExchange(from, postIds.get("table") as string, ids.get("priya.nair@example.com") as string, samId, {
    chosen: false,
    requester_confirmed: false,
    helper_confirmed: false,
    completed_at: null,
    thank_you: null,
    requester_recommends: false,
  });
  if (!offered) fail("Could not save an offer.");

  await ensureExchange(from, postIds.get("park") as string, ids.get("marcus.bell@example.com") as string, ids.get("priya.nair@example.com") as string, {
    chosen: true,
    requester_confirmed: false,
    helper_confirmed: false,
    completed_at: null,
    thank_you: null,
    requester_recommends: false,
  });

  const helper = meId ?? samId;
  const finished = [
    { post: "playdate", requester: danaId, thankYou: "Thank you for coming.", recommend: true },
    { post: "potluck", requester: ids.get("priya.nair@example.com") as string, thankYou: "Thank you for the help.", recommend: true },
    { post: "walk", requester: ids.get("marcus.bell@example.com") as string, thankYou: null, recommend: false },
  ];
  for (const item of finished) {
    await ensureExchange(from, postIds.get(item.post) as string, item.requester, helper, {
      chosen: true,
      requester_confirmed: true,
      helper_confirmed: true,
      completed_at: now,
      thank_you: item.thankYou,
      requester_recommends: item.recommend,
    });
  }

  if (helper) {
    const badge = await from("badges").upsert(
      { user_id: helper, badge: "helped_neighbors", earned_at: now },
      { onConflict: "user_id,badge", ignoreDuplicates: true }
    );
    if (badge.error) fail(publicError(badge.error));
  }

  console.log("Maple Court Neighbors is ready with code SYNC-DEMO.");
}

async function ensureExchange(
  from: ReturnType<typeof rows>,
  postId: string,
  requesterId: string,
  helperId: string,
  fields: {
    chosen: boolean;
    requester_confirmed: boolean;
    helper_confirmed: boolean;
    completed_at: string | null;
    thank_you: string | null;
    requester_recommends: boolean;
  }
) {
  const existing = await from("exchanges").select("id").eq("post_id", postId).eq("helper_id", helperId).maybeSingle();
  if (existing.error) fail(publicError(existing.error));
  if (existing.data) return existing.data.id as string;
  const inserted = await from("exchanges").insert({
    post_id: postId,
    requester_id: requesterId,
    helper_id: helperId,
    ...fields,
  }).select("id").single();
  if (inserted.error || !inserted.data) fail(publicError(inserted.error));
  return inserted.data.id as string;
}

main().catch(() => {
  console.error("The seed could not finish.");
  process.exit(1);
});
