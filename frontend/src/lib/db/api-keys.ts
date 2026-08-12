import { createRequiredClient as createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ApiKeyRow = Database["public"]["Tables"]["api_keys"]["Row"];

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

/** Lists the caller's API keys (RLS-scoped). Never returns the key itself. */
export async function getApiKeys(userId: string): Promise<ApiKeyListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, expires_at, revoked_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.key_prefix,
    lastUsedAt: k.last_used_at,
    expiresAt: k.expires_at,
    revokedAt: k.revoked_at,
    createdAt: k.created_at,
  }));
}

/**
 * Persists a new API key. Only the SHA-256 hash and a short prefix are stored;
 * the plaintext key is generated and returned to the caller exactly once.
 */
export async function createApiKey(
  userId: string,
  input: { name: string; plaintextKey: string }
): Promise<ApiKeyRow> {
  const supabase = await createClient();
  const keyHash = await sha256Hex(input.plaintextKey);
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: userId,
      name: input.name,
      key_hash: keyHash,
      key_prefix: input.plaintextKey.slice(0, 8),
    })
    .select("id, user_id, name, key_hash, key_prefix, last_used_at, expires_at, revoked_at, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function revokeApiKey(keyId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId);
}

/** Generates a live API key of the form ak_live_<base64url>. */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (const byte of bytes) token += alphabet[byte % alphabet.length];
  return `ak_live_${token}`;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}