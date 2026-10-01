import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const onlineConfigured = Boolean(url && key);
let client: SupabaseClient | undefined;
export function getSupabase(): SupabaseClient {
  if (!onlineConfigured) throw new Error("El modo online aún no está configurado.");
  client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
  });
  return client;
}
