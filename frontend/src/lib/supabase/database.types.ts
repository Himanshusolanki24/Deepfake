/**
 * Generated-style type definitions matching the AUTHENTIQ Supabase schema.
 * Regenerate with: npx supabase gen types typescript --project-id <ref>
 * This keeps the DB layer fully typed without needing a live connection.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MediaType = "image" | "video" | "audio";
export type VerdictType = "authentic" | "suspicious" | "manipulated" | "inconclusive";
export type AnalysisStatusType =
  | "created"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";
export type JobStatusType = "queued" | "processing" | "completed" | "failed" | "cancelled";
export type SeverityType = "low" | "medium" | "high";
export type Role = "user" | "analyst" | "admin";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: Role;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: Role;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      analyses: {
        Row: {
          id: string;
          user_id: string;
          case_id: string;
          media_type: MediaType;
          filename: string | null;
          status: AnalysisStatusType;
          verdict: VerdictType | null;
          confidence: number | null;
          confidence_lower: number | null;
          confidence_upper: number | null;
          processing_time_ms: number | null;
          explanation: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          /** Soft delete timestamp - when set, the analysis is considered deleted but retained for audit */
          deleted_at: string | null;
          /** The user who performed the deletion, for audit trail */
          deleted_by: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          case_id?: string;
          media_type: MediaType;
          filename?: string | null;
          status?: AnalysisStatusType;
          verdict?: VerdictType | null;
          confidence?: number | null;
          confidence_lower?: number | null;
          confidence_upper?: number | null;
          processing_time_ms?: number | null;
          explanation?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["analyses"]["Insert"]>;
        Relationships: [];
      };
      analysis_jobs: {
        Row: {
          id: string;
          analysis_id: string;
          user_id: string;
          job_type: string;
          status: JobStatusType;
          progress: number;
          error_code: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          user_id: string;
          job_type?: string;
          status?: JobStatusType;
          progress?: number;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["analysis_jobs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_analysis_id_fkey";
            columns: ["analysis_id"];
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          }
        ];
      };
      media_files: {
        Row: {
          id: string;
          analysis_id: string;
          user_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          sha256: string | null;
          duration_seconds: number | null;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          user_id: string;
          storage_path: string;
          original_filename: string;
          mime_type: string;
          file_size: number;
          sha256?: string | null;
          duration_seconds?: number | null;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["media_files"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "media_files_analysis_id_fkey";
            columns: ["analysis_id"];
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          }
        ];
      };
      signal_results: {
        Row: {
          id: string;
          analysis_id: string;
          signal_type: string;
          score: number | null;
          confidence: number | null;
          severity: SeverityType;
          status: string;
          explanation: string | null;
          model_name: string | null;
          model_version: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          signal_type: string;
          score?: number | null;
          confidence?: number | null;
          severity?: SeverityType;
          status?: string;
          explanation?: string | null;
          model_name?: string | null;
          model_version?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["signal_results"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "signal_results_analysis_id_fkey";
            columns: ["analysis_id"];
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          }
        ];
      };
      evidence: {
        Row: {
          id: string;
          analysis_id: string;
          signal_result_id: string | null;
          type: string;
          title: string | null;
          description: string | null;
          score: number | null;
          confidence: number | null;
          frame_number: number | null;
          timestamp_start: number | null;
          timestamp_end: number | null;
          artifact_path: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          signal_result_id?: string | null;
          type: string;
          title?: string | null;
          description?: string | null;
          score?: number | null;
          confidence?: number | null;
          frame_number?: number | null;
          timestamp_start?: number | null;
          timestamp_end?: number | null;
          artifact_path?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["evidence"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "evidence_analysis_id_fkey";
            columns: ["analysis_id"];
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          }
        ];
      };
      suspicious_frames: {
        Row: {
          id: string;
          analysis_id: string;
          frame_number: number;
          timestamp_seconds: number;
          score: number;
          image_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          frame_number: number;
          timestamp_seconds: number;
          score: number;
          image_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suspicious_frames"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "suspicious_frames_analysis_id_fkey";
            columns: ["analysis_id"];
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          }
        ];
      };
      metadata_records: {
        Row: {
          id: string;
          analysis_id: string;
          exif: Json | null;
          c2pa: Json | null;
          codec: string | null;
          software: string | null;
          creation_time: string | null;
          modification_time: string | null;
          compression_info: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          exif?: Json | null;
          c2pa?: Json | null;
          codec?: string | null;
          software?: string | null;
          creation_time?: string | null;
          modification_time?: string | null;
          compression_info?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["metadata_records"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "metadata_records_analysis_id_fkey";
            columns: ["analysis_id"];
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          }
        ];
      };
      reports: {
        Row: {
          id: string;
          analysis_id: string;
          user_id: string;
          status: string;
          storage_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          user_id: string;
          status?: string;
          storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reports_analysis_id_fkey";
            columns: ["analysis_id"];
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          }
        ];
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          last_used_at: string | null;
          expires_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key_hash: string;
          key_prefix: string;
          last_used_at?: string | null;
          expires_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["api_keys"]["Insert"]>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      usage_records: {
        Row: {
          id: string;
          user_id: string;
          period_start: string;
          period_end: string;
          analysis_count: number;
          storage_bytes: number;
          tier: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          period_start: string;
          period_end: string;
          analysis_count?: number;
          storage_bytes?: number;
          tier?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["usage_records"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "usage_records_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_dashboard_stats: {
        Args: Record<string, never>;
        Returns: {
          total: number;
          authentic: number;
          suspicious: number;
          manipulated: number;
          inconclusive: number;
          requires_review: number;
          processing: number;
        }[];
      };
      get_analysis_trend: {
        Args: { p_days?: number };
        Returns: {
          day: string;
          total: number;
          suspicious: number;
        }[];
      };
      soft_delete_analysis: {
        Args: { p_analysis_id: string };
        Returns: void;
      };
      restore_analysis: {
        Args: { p_analysis_id: string };
        Returns: void;
      };
      hard_delete_analysis: {
        Args: { p_analysis_id: string };
        Returns: void;
      };
      write_audit_log: {
        Args: {
          p_user_id: string | null;
          p_action: string;
          p_resource_type?: string | null;
          p_resource_id?: string | null;
          p_metadata?: Json | null;
        };
        Returns: void;
      };
      owns_analysis: {
        Args: { p_analysis_id: string };
        Returns: boolean;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      media_type: MediaType;
      verdict_type: VerdictType;
      analysis_status_type: AnalysisStatusType;
      job_status_type: JobStatusType;
      severity_type: SeverityType;
      role: Role;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
