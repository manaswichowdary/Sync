import { NextResponse } from "next/server";
import { finishLogin } from "@/lib/data/auth";
import { serviceDb } from "@/lib/data/db";
import { supabaseSetupMessage } from "@/lib/supabase/env";
import { createSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const setup = supabaseSetupMessage();
  if (setup) return NextResponse.redirect(new URL("/", url.origin));
  const code = url.searchParams.get("code");
  const invite = url.searchParams.get("invite");
  const supabase = await createSupabase();
  const db = serviceDb();
  if (!supabase || !db || !code) return NextResponse.redirect(new URL("/?error=link", url.origin));
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/?error=link", url.origin));
  const path = await finishLogin(db, supabase, invite);
  if (path === "/" && url.searchParams.get("after") === "start") {
    return NextResponse.redirect(new URL("/start", url.origin));
  }
  return NextResponse.redirect(new URL(path, url.origin));
}
