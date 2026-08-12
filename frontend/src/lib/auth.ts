import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthUser } from "@/types/auth";
import type { Database } from "@/lib/supabase/database.types";

/** Returns the authenticated Supabase user, or null when not signed in. */
export async function getAuthUser() {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return user;
}

/** Server-side guard: redirects to /auth/login when unauthenticated. */
export async function requireAuth() {
  const supabase = await createClient();
  if (!supabase) {
    redirect("/auth/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

/** Loads the profile row (RLS-scoped) for the given user id. */
export async function getProfile(userId: string) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
  return data;
}

/** Returns { user, profile } for the current session or nulls when signed out. */
export async function getAuthUserWithProfile(): Promise<{
  user: AuthUser;
  profile: Database["public"]["Tables"]["profiles"]["Row"] | null;
} | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const profile = await getProfile(user.id);
  const metaName = user.user_metadata?.full_name;
  const authUser: AuthUser = {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? (typeof metaName === "string" ? metaName : null),
    avatarUrl: profile?.avatar_url ?? null,
    role: profile?.role ?? "user",
    metadata: (user.user_metadata as Record<string, never>) ?? null,
  };

  return { user: authUser, profile };
}
