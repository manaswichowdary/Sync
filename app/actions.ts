"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/actionResult";
import { beginFounder, beginLogin, beginSignup, confirmEmailCode } from "@/lib/data/auth";
import { currentUser, serviceDb } from "@/lib/data/db";
import {
  confirmHelper,
  createGather,
  createGroup,
  createInvite,
  createNeed,
  createOfferPost,
  createReply,
  createStandingOffer,
  createUpdate,
  joinGroup,
  markDone,
  moderateReport,
  offerHelp,
  reportItem,
  savePrefs,
  sendForecastRequest,
  sendThanks,
  setThreadFlag,
  toggleRsvp,
} from "@/lib/data/mutate";
import { supabaseSetupMessage } from "@/lib/supabase/env";
import { createSupabase } from "@/lib/supabase/server";

async function origin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function gate(): Promise<{ user: { id: string; email: string }; db: NonNullable<ReturnType<typeof serviceDb>> } | ActionResult> {
  const setup = supabaseSetupMessage();
  if (setup) return { ok: false, error: setup };
  const user = await currentUser();
  const db = serviceDb();
  if (!user) return { ok: false, error: "Sign in first." };
  if (!db) return { ok: false, error: "Add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local." };
  return { user, db };
}

function isGate(value: { user: { id: string; email: string }; db: NonNullable<ReturnType<typeof serviceDb>> } | ActionResult): value is { user: { id: string; email: string }; db: NonNullable<ReturnType<typeof serviceDb>> } {
  return "db" in value;
}

function refresh(groupId: string, result: ActionResult) {
  if (result.ok) revalidatePath(`/g/${groupId}`);
  return result;
}

export async function startSignup(input: { name: string; email: string; phone: string; code: string }): Promise<ActionResult> {
  const setup = supabaseSetupMessage();
  if (setup) return { ok: false, error: setup };
  const db = serviceDb();
  const supabase = await createSupabase();
  if (!db || !supabase) return { ok: false, error: "Add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local." };
  const result = await beginSignup(db, supabase, await origin(), input);
  if (result.ok && "groupId" in result && result.groupId) redirect(`/g/${result.groupId}`);
  return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.error };
}

export async function startFounder(input: { name: string; email: string; phone: string }): Promise<ActionResult> {
  const setup = supabaseSetupMessage();
  if (setup) return { ok: false, error: setup };
  const db = serviceDb();
  const supabase = await createSupabase();
  if (!db || !supabase) return { ok: false, error: "Add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local." };
  const result = await beginFounder(db, supabase, await origin(), input);
  if (result.ok && "ready" in result && result.ready) return { ok: true, message: "You can name the group below." };
  return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.error };
}

export async function confirmEmailCodeAction(input: { email: string; token: string; after?: "start" }): Promise<ActionResult> {
  const setup = supabaseSetupMessage();
  if (setup) return { ok: false, error: setup };
  const db = serviceDb();
  const supabase = await createSupabase();
  if (!db || !supabase) return { ok: false, error: "Add SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local." };
  const result = await confirmEmailCode(db, supabase, input);
  if (!result.ok) return { ok: false, error: result.error, resend: result.resend };
  redirect(result.path);
}

export async function startLogin(input: { email: string }): Promise<ActionResult> {
  const setup = supabaseSetupMessage();
  if (setup) return { ok: false, error: setup };
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, error: "Add SUPABASE_URL and SUPABASE_ANON_KEY in .env.local." };
  const result = await beginLogin(supabase, await origin(), input.email);
  return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.error };
}

export async function signOut() {
  const supabase = await createSupabase();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

export async function joinWithCode(input: { code: string }): Promise<ActionResult> {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  const result = await joinGroup(ready.db, ready.user, input.code);
  if (result.ok && result.groupId) redirect(`/g/${result.groupId}`);
  return result;
}

export async function createGroupAction(input: { name: string; neighborhood: string; purpose: string; anyway: boolean }): Promise<ActionResult> {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  const result = await createGroup(ready.db, ready.user, input);
  if (result.ok && result.groupId) redirect(`/g/${result.groupId}`);
  return result;
}

export async function createInviteAction(input: { groupId: string; maxUses: number; days: number }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await createInvite(ready.db, ready.user, input));
}

export async function createNeedAction(input: { groupId: string; text: string; childName: string; childSchool: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await createNeed(ready.db, ready.user, input));
}

export async function createOfferAction(input: { groupId: string; text: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await createOfferPost(ready.db, ready.user, input));
}

export async function createStandingOfferAction(input: { groupId: string; weekday: string; start: string; end: string; note: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await createStandingOffer(ready.db, ready.user, input));
}

export async function offerHelpAction(input: { groupId: string; postId: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await offerHelp(ready.db, ready.user, input));
}

export async function confirmHelperAction(input: { groupId: string; exchangeId: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await confirmHelper(ready.db, ready.user, input));
}

export async function markDoneAction(input: { groupId: string; exchangeId: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await markDone(ready.db, ready.user, input));
}

export async function sendThanksAction(input: { groupId: string; exchangeId: string; note: string; recommend: boolean }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await sendThanks(ready.db, ready.user, input));
}

export async function createGatherAction(input: { groupId: string; text: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await createGather(ready.db, ready.user, input));
}

export async function rsvpAction(input: { groupId: string; postId: string; direction: "in" | "out" }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await toggleRsvp(ready.db, ready.user, input));
}

export async function createUpdateAction(input: { groupId: string; topic: string; text: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await createUpdate(ready.db, ready.user, input));
}

export async function createReplyAction(input: { groupId: string; postId: string; text: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await createReply(ready.db, ready.user, input));
}

export async function threadFlagAction(input: { groupId: string; postId: string; flag: "mute" | "leave" | "unmute" | "rejoin" }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  const result = await setThreadFlag(ready.db, ready.user, input);
  if (result.ok) {
    revalidatePath(`/g/${input.groupId}`);
    revalidatePath("/preferences");
  }
  return result;
}

export async function savePrefsAction(input: { help: boolean; gather: boolean; updates: boolean }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  const result = await savePrefs(ready.db, ready.user, input);
  if (result.ok) revalidatePath("/preferences");
  return result;
}

export async function reportAction(input: { groupId: string; targetType: string; targetId: string; reason: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await reportItem(ready.db, ready.user, input));
}

export async function forecastRequestAction(input: { groupId: string; summary: string }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  return refresh(input.groupId, await sendForecastRequest(ready.db, ready.user, input));
}

export async function moderateAction(input: { reportId: string; action: "restore" | "remove" }) {
  const ready = await gate();
  if (!isGate(ready)) return ready;
  const result = await moderateReport(ready.db, ready.user, input);
  if (result.ok) revalidatePath("/admin");
  return result;
}
