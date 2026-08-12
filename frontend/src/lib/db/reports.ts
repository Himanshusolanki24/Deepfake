import { createRequiredClient as createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];

export interface ReportListItem {
  id: string;
  analysisId: string;
  status: ReportRow["status"];
  storagePath: string | null;
  createdAt: string;
}

/** Lists the caller's reports (RLS-scoped by user_id). */
export async function getReports(userId: string, options?: { limit?: number }): Promise<ReportListItem[]> {
  const supabase = await createClient();
  const { limit = 25 } = options ?? {};
  const { data, error } = await supabase
    .from("reports")
    .select("id, analysis_id, status, storage_path, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    analysisId: r.analysis_id,
    status: r.status,
    storagePath: r.storage_path,
    createdAt: r.created_at,
  }));
}

/** Fetches a report only if it belongs to the caller. */
export async function getReport(reportId: string, userId: string): Promise<ReportRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, analysis_id, user_id, status, storage_path, created_at, updated_at")
    .eq("id", reportId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createReport(
  userId: string,
  input: Pick<ReportInsert, "analysis_id" | "status" | "storage_path">
): Promise<ReportRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .insert({ ...input, user_id: userId })
    .select("id, analysis_id, user_id, status, storage_path, created_at, updated_at")
    .single();
  if (error) throw error;
  return data;
}