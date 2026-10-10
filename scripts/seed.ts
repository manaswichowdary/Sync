import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { approvedText } from "../lib/approveText";
import { CODE_DEFAULT_MAX_USES, CODE_EXPIRY_DAYS } from "../lib/config";
import { codeExpiresAt, updateExpiresAt } from "../lib/groupRules";
import { missingSupabaseEnv } from "../lib/supabase/env";

const GROUP_NAME = "Maple Court Neighbors";
const NEIGHBORHOOD = "Maple Court";
const PURPOSE = "Pickups, rides, and borrowing";
const CODE = "SYNC-DEMO";

const PEOPLE = [
  { firstName: "Dana", email: "dana.ellis@example.com", phone: "5550100142", role: "creator" as const },
  { firstName: "Sam", email: "sam.ortiz@example.com", phone: "5550100198", role: "member" as const },
];

const POSTS = [
  { email: PEOPLE[0].email, kind: "need", topic: null, text: "Could someone grab a bag of rice from the store this week?" },
  { email: PEOPLE[1].email, kind: "offer", topic: null, text: "I can lend a folding chair if someone needs one." },
  { email: PEOPLE[0].email, kind: "gather", topic: null, text: "Coffee on Saturday morning if anyone wants to stop by." },
  { email: PEOPLE[1].email, kind: "update", topic: "heads_up", text: "The lobby door sticks. Give it a firm pull." },
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

function publicError(error: { message?: string } | null): string {
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

async function userId(db: SupabaseClient, email: string): Promise<string> {
  const created = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { first_name: PEOPLE.find((person) => person.email === email)?.firstName ?? "" },
  });
  if (created.data.user?.id) return created.data.user.id;
  for (let page = 1; page <= 5; page += 1) {
    const listed = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (listed.error) fail(publicError(listed.error));
    const found = listed.data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found.id;
    if (listed.data.users.length < 200) break;
  }
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

  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const from = rows(db);
  const ids = new Map<string, string>();

  for (const person of PEOPLE) {
    const id = await userId(db, person.email);
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

  const danaId = ids.get(PEOPLE[0].email) as string;
  const foundGroup = await from("groups")
    .select("id")
    .eq("name", GROUP_NAME)
    .eq("neighborhood", NEIGHBORHOOD)
    .eq("removed", false)
    .limit(1)
    .maybeSingle();
  if (foundGroup.error) fail(publicError(foundGroup.error));

  let groupId = foundGroup.data?.id as string | undefined;
  if (!groupId) {
    groupId = crypto.randomUUID();
    const inserted = await from("groups").insert({
      id: groupId,
      name: GROUP_NAME,
      neighborhood: NEIGHBORHOOD,
      purpose: PURPOSE,
      creator_id: danaId,
      status: "active",
    });
    if (inserted.error) {
      if (inserted.error.code === "23514") {
        fail(
          'The groups.purpose check rejected the demo purpose. In the Supabase SQL editor, run: alter table groups drop constraint if exists groups_purpose_check; alter table groups add constraint groups_purpose_check check (char_length(trim(purpose)) > 0);'
        );
      }
      fail(publicError(inserted.error));
    }
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

  const foundCode = await from("invite_codes").select("code, group_id").eq("code", CODE).maybeSingle();
  if (foundCode.error) fail(publicError(foundCode.error));
  if (foundCode.data && foundCode.data.group_id !== groupId) {
    fail("SYNC-DEMO is already used by another group.");
  }
  if (!foundCode.data) {
    const inserted = await from("invite_codes").insert({
      code: CODE,
      group_id: groupId,
      created_by: danaId,
      max_uses: CODE_DEFAULT_MAX_USES,
      uses: 0,
      expires_at: codeExpiresAt(new Date(), CODE_EXPIRY_DAYS).toISOString(),
    });
    if (inserted.error) fail(publicError(inserted.error));
  }

  for (const post of ready) {
    const existing = await from("posts")
      .select("id")
      .eq("group_id", groupId)
      .eq("text", post.text)
      .eq("removed", false)
      .limit(1)
      .maybeSingle();
    if (existing.error) fail(publicError(existing.error));
    if (existing.data) continue;
    const inserted = await from("posts").insert({
      group_id: groupId,
      author_id: ids.get(post.email),
      kind: post.kind,
      topic: post.topic,
      text: post.text,
      expires_at: post.kind === "update" ? updateExpiresAt(new Date()).toISOString() : null,
    });
    if (inserted.error) fail(publicError(inserted.error));
  }

  console.log("Maple Court Neighbors is ready with code SYNC-DEMO.");
}

main().catch(() => {
  console.error("The seed could not finish.");
  process.exit(1);
});
