import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!url || !key) {
      throw new Error(`Supabase config missing: url=${url ? "set" : "missing"}, key=${key ? "set" : "missing"}`);
    }

    _supabase = createClient(url, key);
  }
  return _supabase;
}
