import type { Database, Json } from "@/lib/supabase/database.types";

export interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: Database["public"]["Enums"]["role"];
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  role: Database["public"]["Enums"]["role"];
  metadata: Json | null;
}
