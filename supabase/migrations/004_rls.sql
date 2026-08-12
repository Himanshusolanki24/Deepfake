-- 004_rls.sql
-- AUTHENTIQ: Row Level Security for every exposed application table.
-- Ownership is always derived from auth.uid() — never from client-sent ids.

begin;

-- ------------------------------------------------------------ helper
-- AUTHENTIQ: ownership helper
-- Returns true when the caller owns the analysis (used by child tables that
-- only carry analysis_id and no direct user_id column).
create or replace function public.owns_analysis(p_analysis_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.analyses a
    where a.id = p_analysis_id
      and a.user_id = auth.uid()
  );
$$;

-- Admins can bypass ownership checks where row-level admin access is intended.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ------------------------------------------------------------ profiles
alter table public.profiles enable row level security;

create policy "Profiles are visible to the owner and admins"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or is_admin());
-- ^ AUTHENTIQ: profiles view

create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Profile rows are created by the auth trigger, never inserted by clients.
create policy "Users insert their own profile placeholder"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- ------------------------------------------------------------ analyses
alter table public.analyses enable row level security;

create policy "Users can view own analyses"
  on public.analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own analyses"
  on public.analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own analyses"
  on public.analyses for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own analyses"
  on public.analyses for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ analysis_jobs
alter table public.analysis_jobs enable row level security;

create policy "Users can view own jobs"
  on public.analysis_jobs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own jobs"
  on public.analysis_jobs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own jobs"
  on public.analysis_jobs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own jobs"
  on public.analysis_jobs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ media_files
alter table public.media_files enable row level security;

create policy "Users can view own media"
  on public.media_files for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own media"
  on public.media_files for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own media"
  on public.media_files for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own media"
  on public.media_files for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ signal_results
alter table public.signal_results enable row level security;

create policy "Users can view own signal results"
  on public.signal_results for select
  to authenticated
  using (owns_analysis(analysis_id));

create policy "Users can create own signal results"
  on public.signal_results for insert
  to authenticated
  with check (owns_analysis(analysis_id));

create policy "Users can update own signal results"
  on public.signal_results for update
  to authenticated
  using (owns_analysis(analysis_id))
  with check (owns_analysis(analysis_id));

create policy "Users can delete own signal results"
  on public.signal_results for delete
  to authenticated
  using (owns_analysis(analysis_id));

-- ------------------------------------------------------------ evidence
alter table public.evidence enable row level security;

create policy "Users can view own evidence"
  on public.evidence for select
  to authenticated
  using (owns_analysis(analysis_id));

create policy "Users can create own evidence"
  on public.evidence for insert
  to authenticated
  with check (owns_analysis(analysis_id));

create policy "Users can update own evidence"
  on public.evidence for update
  to authenticated
  using (owns_analysis(analysis_id))
  with check (owns_analysis(analysis_id));

create policy "Users can delete own evidence"
  on public.evidence for delete
  to authenticated
  using (owns_analysis(analysis_id));

-- ------------------------------------------------------------ suspicious_frames
alter table public.suspicious_frames enable row level security;

create policy "Users can view own suspicious frames"
  on public.suspicious_frames for select
  to authenticated
  using (owns_analysis(analysis_id));

create policy "Users can create own suspicious frames"
  on public.suspicious_frames for insert
  to authenticated
  with check (owns_analysis(analysis_id));

create policy "Users can delete own suspicious frames"
  on public.suspicious_frames for delete
  to authenticated
  using (owns_analysis(analysis_id));

-- ------------------------------------------------------------ metadata_records
alter table public.metadata_records enable row level security;

create policy "Users can view own metadata records"
  on public.metadata_records for select
  to authenticated
  using (owns_analysis(analysis_id));

create policy "Users can create own metadata records"
  on public.metadata_records for insert
  to authenticated
  with check (owns_analysis(analysis_id));

create policy "Users can update own metadata records"
  on public.metadata_records for update
  to authenticated
  using (owns_analysis(analysis_id))
  with check (owns_analysis(analysis_id));

create policy "Users can delete own metadata records"
  on public.metadata_records for delete
  to authenticated
  using (owns_analysis(analysis_id));

-- ------------------------------------------------------------ reports
alter table public.reports enable row level security;

create policy "Users can view own reports"
  on public.reports for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own reports"
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own reports"
  on public.reports for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own reports"
  on public.reports for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ api_keys
alter table public.api_keys enable row level security;

create policy "Users can view own api keys"
  on public.api_keys for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create own api keys"
  on public.api_keys for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own api keys"
  on public.api_keys for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own api keys"
  on public.api_keys for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can revoke own api keys"
  on public.api_keys for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ audit_logs
alter table public.audit_logs enable row level security;

-- Audit reads are limited to the user's own entries (admins may inspect all).
create policy "Users can view own audit logs"
  on public.audit_logs for select
  to authenticated
  using ((select auth.uid()) = user_id or is_admin());

-- Writes go through the security definer write_audit_log() function only.
create policy "No direct audit insert"
  on public.audit_logs for insert
  to authenticated
  with check (false);

create policy "No direct audit update or delete"
  on public.audit_logs for update
  to authenticated
  using (false)
  with check (false);

create policy "No direct audit delete"
  on public.audit_logs for delete
  to authenticated
  using (false);

commit;