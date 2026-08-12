import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Server-only Supabase client authenticated with the service role key.
 *
 * WARNING: This client bypasses Row Level Security and can read/write every
 * row in the database. It MUST never be imported from a client component or
 * used anywhere the browser can reach. Use it only for trusted operations:
 * backend callbacks, admin workflows and system-level jobs.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase service role key. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let adminSingleton: SupabaseClient<Database> | undefined;

export function getSupabaseAdminClient(): SupabaseClient<Database> {
  if (typeof window !== "undefined") {
    throw new Error(
      "The Supabase admin client (service role) must not be imported into the browser bundle."
    );
  }
  if (!adminSingleton) {
    adminSingleton = createAdminClient();
  }
  return adminSingleton;
}
