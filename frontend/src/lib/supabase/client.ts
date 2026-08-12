import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}

let clientSingleton: SupabaseClient<Database> | undefined;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowserClient can only be used in the browser.");
  }
  if (!clientSingleton) {
    clientSingleton = createClient();
  }
  return clientSingleton;
}
