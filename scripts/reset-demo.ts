import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { missingSupabaseEnv } from "../lib/supabase/env";

const GROUP_NAME = "Maple Court Neighbors";

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

async function main() {
  const rl = createInterface({ input, output });
  const answer = await rl.question("Clear demo posts for Maple Court Neighbors? Type yes to continue. ");
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Nothing was cleared.");
    return;
  }

  loadEnvFile();
  const missing = missingSupabaseEnv().filter((name) => name !== "SUPABASE_ANON_KEY");
  if (missing.length) fail(`Add ${missing.join(", ")} in .env.local.`);

  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const from = rows(db);

  const found = await from("groups").select("id").eq("name", GROUP_NAME).eq("removed", false).limit(1).maybeSingle();
  if (found.error) fail(publicError(found.error));
  if (!found.data?.id) {
    console.log("Maple Court Neighbors was not found. Run npm run seed.");
    return;
  }
  const groupId = found.data.id as string;

  const posts = await from("posts").select("id").eq("group_id", groupId);
  if (posts.error) fail(publicError(posts.error));
  const postIds = (posts.data ?? []).map((row: { id: string }) => row.id);

  const replies = postIds.length
    ? await from("replies").select("id").in("post_id", postIds)
    : { data: [], error: null };
  if (replies.error) fail(publicError(replies.error));
  const replyIds = (replies.data ?? []).map((row: { id: string }) => row.id);

  const reportIds = [...postIds, ...replyIds, groupId];
  if (reportIds.length) {
    const cleared = await from("reports").delete().in("target_id", reportIds);
    if (cleared.error) fail(publicError(cleared.error));
  }

  if (postIds.length) {
    const clearedPosts = await from("posts").delete().eq("group_id", groupId);
    if (clearedPosts.error) fail(publicError(clearedPosts.error));
  }

  const clearedTimes = await from("standing_offers").delete().eq("group_id", groupId);
  if (clearedTimes.error) fail(publicError(clearedTimes.error));

  console.log("Cleared demo posts for Maple Court Neighbors. Run npm run seed.");
}

main().catch(() => {
  console.error("The reset could not finish.");
  process.exit(1);
});
