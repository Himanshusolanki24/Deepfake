import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  input: { fullName?: string; avatarUrl?: string }
): Promise<ProfileRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName,
      avatar_url: input.avatarUrl,
    })
    .eq("id", userId)
    .select("id, email, full_name, avatar_url, role, created_at, updated_at")
    .maybeSingle();
  if (error) throw error;
  return data;
}