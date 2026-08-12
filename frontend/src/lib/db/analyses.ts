import { createRequiredClient as createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type AnalysisRow = Database["public"]["Tables"]["analyses"]["Row"];
type AnalysisInsert = Database["public"]["Tables"]["analyses"]["Insert"];

export interface AnalysisListItem {
  id: string;
  caseId: string;
  mediaType: AnalysisRow["media_type"];
  filename: string | null;
  status: AnalysisRow["status"];
  verdict: AnalysisRow["verdict"];
  confidence: number | null;
  createdAt: string;
}

const LIST_COLUMNS =
  "id, case_id, media_type, filename, status, verdict, confidence, created_at" as const;

function toListItem(row: Pick<AnalysisRow, "id" | "case_id" | "media_type" | "filename" | "status" | "verdict" | "confidence" | "created_at">): AnalysisListItem {
  return {
    id: row.id,
    caseId: row.case_id,
    mediaType: row.media_type,
    filename: row.filename,
    status: row.status,
    verdict: row.verdict,
    confidence: row.confidence,
    createdAt: row.created_at,
  };
}

/** Server-side, RLS-scoped history query with pagination + filters. */
export async function getAnalyses(userId: string, options?: {
  limit?: number;
  offset?: number;
  search?: string;
  mediaType?: AnalysisRow["media_type"] | "all";
  verdict?: AnalysisRow["verdict"] | "all";
}): Promise<{ items: AnalysisListItem[]; total: number }> {
  const supabase = await createClient();
  const { limit = 25, offset = 0, search, mediaType, verdict } = options ?? {};

  let query = supabase
    .from("analyses")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("user_id", userId);

  if (search) {
    query = query.or(`filename.ilike.%${search}%,case_id.ilike.%${search}%`);
  }
  if (mediaType && mediaType !== "all") {
    query = query.eq("media_type", mediaType);
  }
  if (verdict && verdict !== "all") {
    query = query.eq("verdict", verdict);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: (data ?? []).map(toListItem),
    total: count ?? 0,
  };
}

export interface AnalysisDetail extends AnalysisRow {
  evidenceCount: number;
  signalCount: number;
}

export async function getAnalysis(id: string, userId: string): Promise<AnalysisDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("analyses")
    .select("id, user_id, case_id, media_type, filename, status, verdict, confidence, confidence_lower, confidence_upper, processing_time_ms, explanation, created_at, updated_at, completed_at, deleted_at, deleted_by")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ count: evidenceCount }, { count: signalCount }] = await Promise.all([
    supabase.from("evidence").select("id", { count: "exact", head: true }).eq("analysis_id", id),
    supabase.from("signal_results").select("id", { count: "exact", head: true }).eq("analysis_id", id),
  ]);

  return { ...data, evidenceCount: evidenceCount ?? 0, signalCount: signalCount ?? 0 };
}

export async function createAnalysis(
  userId: string,
  input: {
    mediaType: AnalysisRow["media_type"];
    filename?: string;
    caseId?: string;
  }
): Promise<AnalysisRow> {
  const supabase = await createClient();
  const insert: AnalysisInsert = {
    user_id: userId,
    media_type: input.mediaType,
    filename: input.filename ?? null,
    case_id: input.caseId,
    status: "created",
  };
  const { data, error } = await supabase
    .from("analyses")
    .insert(insert)
    .select("id, user_id, case_id, media_type, filename, status, verdict, confidence, confidence_lower, confidence_upper, processing_time_ms, explanation, created_at, updated_at, completed_at, deleted_at, deleted_by")
    .single();
  if (error) throw error;
  return data;
}

export async function updateAnalysisStatus(
  id: string,
  userId: string,
  update: {
    status?: AnalysisRow["status"];
    verdict?: AnalysisRow["verdict"];
    confidence?: number | null;
    confidenceLower?: number | null;
    confidenceUpper?: number | null;
    completedAt?: string | null;
  }
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("analyses")
    .update({
      status: update.status,
      verdict: update.verdict,
      confidence: update.confidence,
      confidence_lower: update.confidenceLower,
      confidence_upper: update.confidenceUpper,
      completed_at: update.completedAt,
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteAnalysis(id: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("analyses").delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}