import { PENDING_SIGNUP_HOURS } from "../config";
import { cleanEmail, firstNameOf, phoneOk } from "../signupFields";
import type { Db } from "./db";
import { from } from "./db";
import { applyInviteCode, assertCodeAvailable } from "./join";

type AuthClient = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null } }>;
    signInWithOtp: (args: {
      email: string;
      options?: { emailRedirectTo?: string; shouldCreateUser?: boolean; data?: Record<string, string> };
    }) => Promise<{ error: { message: string } | null }>;
    signOut: () => Promise<{ error: { message: string } | null }>;
  };
};

function textMeta(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function beginSignup(
  db: Db,
  supabase: AuthClient,
  origin: string,
  input: { name: string; email: string; phone: string; code: string }
) {
  const email = cleanEmail(input.email);
  const firstName = firstNameOf(input.name);
  const phone = input.phone.trim();
  if (!firstName) return { ok: false as const, error: "Enter a first name." };
  if (!email) return { ok: false as const, error: "Enter an email address. That is your login." };
  if (!phoneOk(phone)) return { ok: false as const, error: "Enter a phone number." };
  if (!input.code.trim()) return { ok: false as const, error: "A group code is required." };

  const code = await assertCodeAvailable(db, email, input.code);
  if (!code.ok) return code;

  const { data: session } = await supabase.auth.getUser();
  if (session.user && session.user.email?.toLowerCase() === email) {
    await ensureProfile(db, session.user.id, email, firstName, phone, code.code);
    const joined = await applyInviteCode(db, session.user.id, email, code.code);
    if (!joined.ok) return joined;
    await from(db, "pending_signups").delete().eq("email", email);
    return { ok: true as const, groupId: joined.groupId };
  }
  if (session.user) {
    return { ok: false as const, error: "That email does not match the account you are using." };
  }

  await from(db, "pending_signups").upsert({
    email,
    first_name: firstName,
    phone,
    invite_code: code.code,
    created_at: new Date().toISOString(),
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback?invite=${encodeURIComponent(code.code)}`,
      data: { first_name: firstName, phone, invite_code: code.code },
    },
  });
  if (error) {
    await from(db, "pending_signups").delete().eq("email", email);
    return { ok: false as const, error: "We could not send the login link. Your name and phone were not saved." };
  }
  return { ok: true as const, message: "Check your email for a login link. Nothing is posted until you approve it." };
}

export async function beginFounder(
  db: Db,
  supabase: AuthClient,
  origin: string,
  input: { name: string; email: string; phone: string }
) {
  const email = cleanEmail(input.email);
  const firstName = firstNameOf(input.name);
  const phone = input.phone.trim();
  if (!firstName) return { ok: false as const, error: "Enter a first name." };
  if (!email) return { ok: false as const, error: "Enter an email address. That is your login." };
  if (!phoneOk(phone)) return { ok: false as const, error: "Enter a phone number." };

  const { data: session } = await supabase.auth.getUser();
  if (session.user && session.user.email?.toLowerCase() === email) {
    await ensureProfile(db, session.user.id, email, firstName, phone, null);
    return { ok: true as const, ready: true as const };
  }
  if (session.user) {
    return { ok: false as const, error: "That email does not match the account you are using." };
  }

  await from(db, "pending_signups").upsert({
    email,
    first_name: firstName,
    phone,
    invite_code: "",
    created_at: new Date().toISOString(),
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${origin}/auth/callback?after=start`,
      data: { first_name: firstName, phone },
    },
  });
  if (error) {
    await from(db, "pending_signups").delete().eq("email", email);
    return { ok: false as const, error: "We could not send the login link. Your name and phone were not saved." };
  }
  return { ok: true as const, message: "Check your email for a login link. Then you can name the group." };
}

export async function beginLogin(supabase: AuthClient, origin: string, emailRaw: string) {
  const email = cleanEmail(emailRaw);
  if (!email) return { ok: false as const, error: "Enter the email you used before." };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { ok: false as const, error: "We could not send a login link. New neighbors use the signup form." };
  return { ok: true as const, message: "Check your email for a login link." };
}

async function ensureProfile(db: Db, userId: string, email: string, firstName: string, phone: string, code: string | null) {
  const { data } = await from(db, "profiles").select("id").eq("id", userId).maybeSingle();
  if (data) return;
  await from(db, "profiles").insert({
    id: userId,
    first_name: firstName,
    email,
    phone,
    created_via_code: code,
  });
}

export async function finishLogin(db: Db, supabase: AuthClient, inviteFromUrl: string | null): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user?.email) return "/";
  const email = user.email.toLowerCase();
  const { data: pending } = await from(db, "pending_signups").select("*").eq("email", email).maybeSingle();
  const fresh =
    pending && Date.now() - new Date(pending.created_at).getTime() < PENDING_SIGNUP_HOURS * 60 * 60 * 1000
      ? pending
      : null;
  const meta = user.user_metadata ?? {};
  const firstName = fresh?.first_name || textMeta(meta.first_name);
  const phone = fresh?.phone || textMeta(meta.phone);
  const invite = fresh?.invite_code || inviteFromUrl || textMeta(meta.invite_code) || null;

  const { data: profile } = await from(db, "profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) {
    if (!firstName || !phone) return "/?notice=finish";
    await ensureProfile(db, user.id, email, firstName, phone, invite);
  }
  if (invite) await applyInviteCode(db, user.id, email, invite);
  if (pending) await from(db, "pending_signups").delete().eq("email", email);

  const { data: memberships } = await from(db, "group_members").select("group_id").eq("user_id", user.id);
  const ids = (memberships ?? []).map((row: { group_id: string }) => row.group_id);
  if (ids.length === 0) return "/";
  const { data: groups } = await from(db, "groups")
    .select("id, last_activity_at")
    .in("id", ids)
    .eq("removed", false);
  const best = (groups ?? []).sort((a: { last_activity_at: string }, b: { last_activity_at: string }) =>
    b.last_activity_at.localeCompare(a.last_activity_at)
  )[0];
  return best ? `/g/${best.id}` : "/";
}
