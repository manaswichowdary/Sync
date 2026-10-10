import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabase, serviceDb } from "../supabase/server";

export type Db = SupabaseClient;

export function from(db: Db, table: string): any {
  return (db as any).from(table);
}

export async function currentUser(): Promise<{ id: string; email: string } | null> {
  const supabase = await createSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user?.email) return null;
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}

export { serviceDb };
