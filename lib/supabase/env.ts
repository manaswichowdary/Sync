export const SUPABASE_ENV = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;

/** Names of Supabase settings that are unset. Values are never returned. */
export function missingSupabaseEnv(): string[] {
  return SUPABASE_ENV.filter((name) => {
    const value = process.env[name];
    return typeof value !== "string" || value.trim() === "";
  });
}

export function supabaseSetupMessage(missing = missingSupabaseEnv()): string | null {
  if (missing.length === 0) return null;
  return `Add ${missing.join(", ")} in .env.local.`;
}
