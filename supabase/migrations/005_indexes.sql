-- 005_indexes.sql
-- AUTHENTIQ: indexes for RLS columns, history queries and filters.

begin;

-- ------------------------------------------------------------ analyses
create index analyses_user_created_idx on public.analyses (user_id, created_at desc);
create index analyses_user_id_idx on public.analyses (user_id);
create index analyses_created_at_idx on public.analyses (created_at desc);
create index analyses_status_idx on public.analyses (status);
create index analyses_verdict_idx on public.analyses (verdict);
create index analyses_media_type_idx on public.analyses (media_type);

-- ------------------------------------------------------------ child tables
create index analyses_jobs_analysis_user_idx on public.analysis_jobs (analysis_id, user_id);
create index analyses_jobs_status_idx on public.analysis_jobs (status) where status in ('queued', 'processing');

create index media_files_analysis_user_idx on public.media_files (analysis_id, user_id);
create index media_files_user_id_idx on public.media_files (user_id);
create index media_files_sha256_idx on public.media_files (sha256) where sha256 is not null;

create index signal_results_analysis_idx on public.signal_results (analysis_id);
create index signal_results_signal_type_idx on public.signal_results (signal_type);

create index evidence_analysis_idx on public.evidence (analysis_id);
create index evidence_signal_result_idx on public.evidence (signal_result_id) where signal_result_id is not null;

-- Per recommendation: (analysis_id, timestamp_seconds) for suspicious frames.
create index suspicious_frames_analysis_ts_idx on public.suspicious_frames (analysis_id, timestamp_seconds);
create index suspicious_frames_score_idx on public.suspicious_frames (score desc);

create index metadata_records_analysis_idx on public.metadata_records (analysis_id);

create index reports_user_created_idx on public.reports (user_id, created_at desc);
create index reports_analysis_idx on public.reports (analysis_id);

create index api_keys_user_idx on public.api_keys (user_id);
create index api_keys_hash_idx on public.api_keys (key_hash);

create index audit_logs_user_created_idx on public.audit_logs (user_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action);

commit;