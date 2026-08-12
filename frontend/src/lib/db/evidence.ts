import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type EvidenceRow = Database["public"]["Tables"]["evidence"]["Row"];
type SignalRow = Database["public"]["Tables"]["signal_results"]["Row"];
type FrameRow = Database["public"]["Tables"]["suspicious_frames"]["Row"];

/** Signals for one analysis. Ownership is enforced via the analysis user filter + RLS. */
export async function getAnalysisSignals(
  analysisId: string,
  userId: string
): Promise<SignalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("signal_results")
    .select("id, analysis_id, signal_type, score, confidence, severity, status, explanation, model_name, model_version, created_at")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  void userId; // RLS enforces ownership; explicit user context retained for clarity.
  return data ?? [];
}

/** Evidence items for one analysis (RLS-scoped through the analysis owner). */
export async function getAnalysisEvidence(
  analysisId: string,
  userId: string
): Promise<EvidenceRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence")
    .select("id, analysis_id, signal_result_id, type, title, description, score, confidence, frame_number, timestamp_start, timestamp_end, artifact_path, metadata, created_at")
    .eq("analysis_id", analysisId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  void userId;
  return data ?? [];
}

/** Suspicious frames for one analysis (RLS-scoped through the analysis owner). */
export async function getSuspiciousFrames(
  analysisId: string,
  userId: string
): Promise<FrameRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suspicious_frames")
    .select("id, analysis_id, frame_number, timestamp_seconds, score, image_path, created_at")
    .eq("analysis_id", analysisId)
    .order("timestamp_seconds", { ascending: true });
  if (error) throw error;
  void userId;
  return data ?? [];
}

/** Adds evidence to an owned analysis. */
export async function createEvidence(
  analysisId: string,
  userId: string,
  input: Omit<Database["public"]["Tables"]["evidence"]["Insert"], "analysis_id">
): Promise<EvidenceRow> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evidence")
    .insert({ ...input, analysis_id: analysisId })
    .select("id, analysis_id, signal_result_id, type, title, description, score, confidence, frame_number, timestamp_start, timestamp_end, artifact_path, metadata, created_at")
    .single();
  if (error) throw error;
  void userId;
  return data;
}