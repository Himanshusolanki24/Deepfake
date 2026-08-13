/**
 * AUTHENTIQ Usage Tracking Helpers
 *
 * TypeScript helpers for querying and managing usage records.
 * Usage is tracked per user per billing period for rate limiting and subscription enforcement.
 */

import { createRequiredClient as createClient } from "@/lib/supabase/server";

export interface UsageSummary {
  userId: string;
  periodStart: string;
  periodEnd: string;
  analysisCount: number;
  storageBytes: number;
  tier: string;
  /** -1 means unlimited */
  analysisLimit: number;
  /** -1 means unlimited */
  storageLimitGb: number;
}

export interface UsageRecord {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  analysisCount: number;
  storageBytes: number;
  tier: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the current billing period's usage summary for the authenticated user.
 */
export async function getCurrentUsage(): Promise<UsageSummary | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_current_usage");

  if (error) {
    // If no usage record exists yet, return default values
    if ((error as { code?: string }).code === "PGRST116") {
      return null;
    }
    throw error;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0] as Record<string, unknown>;
  return {
    userId: row.user_id as string,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    analysisCount: row.analysis_count as number,
    storageBytes: row.storage_bytes as number,
    tier: row.tier as string,
    analysisLimit: row.analysis_limit as number,
    storageLimitGb: row.storage_limit_gb as number,
  };
}

/**
 * Get usage history for the authenticated user.
 *
 * @param limit - Maximum number of records to return
 */
export async function getUsageHistory(limit: number = 12): Promise<UsageRecord[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("usage_records")
    .select("id, user_id, period_start, period_end, analysis_count, storage_bytes, tier, created_at, updated_at")
    .order("period_start", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    analysisCount: row.analysis_count,
    storageBytes: row.storage_bytes,
    tier: row.tier,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Increment the analysis count for the current user.
 * This is typically called by the backend after an analysis is created.
 */
export async function incrementAnalysisCount(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to increment usage");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("increment_analysis_count", {
    p_user_id: user.id,
  });

  if (error) throw error;
}

/**
 * Add storage usage for the current user.
 *
 * @param bytes - Number of bytes to add to the storage total
 */
export async function addStorageUsage(bytes: number): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User must be authenticated to add storage usage");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("add_storage_usage", {
    p_user_id: user.id,
    p_bytes: bytes,
  });

  if (error) throw error;
}

/**
 * Check if the user has remaining analysis quota.
 *
 * @returns Object with hasQuota boolean and current usage info
 */
export async function checkAnalysisQuota(): Promise<{
  hasQuota: boolean;
  remaining: number;
  used: number;
  limit: number;
  tier: string;
}> {
  const usage = await getCurrentUsage();

  // No usage record means user hasn't used any quota yet
  if (!usage) {
    return {
      hasQuota: true,
      remaining: 100, // Free tier default
      used: 0,
      limit: 100,
      tier: "free",
    };
  }

  const { analysisCount, analysisLimit, tier } = usage;

  // -1 means unlimited
  if (analysisLimit === -1) {
    return {
      hasQuota: true,
      remaining: -1, // Unlimited
      used: analysisCount,
      limit: -1,
      tier,
    };
  }

  const remaining = Math.max(0, analysisLimit - analysisCount);

  return {
    hasQuota: remaining > 0,
    remaining,
    used: analysisCount,
    limit: analysisLimit,
    tier,
  };
}

/**
 * Format bytes to human-readable string.
 */
export function formatStorageBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Calculate storage usage percentage.
 */
export function calculateStoragePercent(bytes: number, limitGb: number): number {
  if (limitGb === -1) return 0; // Unlimited
  if (limitGb === 0) return 100;

  const limitBytes = limitGb * 1024 * 1024 * 1024;
  return Math.min(100, (bytes / limitBytes) * 100);
}
