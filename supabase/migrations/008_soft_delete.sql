-- 008_soft_delete.sql
-- AUTHENTIQ: Soft delete for analyses with auditability.
-- Instead of hard deletion, analyses are marked as deleted and retained for audit.

begin;

-- Add deleted_at column to analyses
alter table public.analyses
  add column if not exists deleted_at timestamptz;

comment on column public.analyses.deleted_at is
  'When set, the analysis is considered soft-deleted. The row is retained for audit.';

-- Add deleted_by column for audit trail
alter table public.analyses
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

comment on column public.analyses.deleted_by is
  'The user who performed the deletion, for audit trail.';

-- Create index for filtering out deleted analyses efficiently
create index if not exists analyses_deleted_at_idx
  on public.analyses (deleted_at)
  where deleted_at is not null;

-- Create composite index for common query: user's non-deleted analyses
create index if not exists analyses_user_active_idx
  on public.analyses (user_id, created_at desc)
  where deleted_at is null;

-- Update RLS policies to exclude soft-deleted analyses from normal queries
-- First, drop the existing select policy
drop policy if exists "Users can view own analyses" on public.analyses;

-- Recreate with soft-delete awareness
create policy "Users can view own non-deleted analyses"
  on public.analyses for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    and deleted_at is null
  );

-- Admins can view deleted analyses for audit
create policy "Admins can view all analyses including deleted"
  on public.analyses for select
  to authenticated
  using (is_admin());

-- Soft delete function (sets deleted_at and deleted_by)
create or replace function public.soft_delete_analysis(p_analysis_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.analyses
     set deleted_at = now(),
         deleted_by = auth.uid()
   where id = p_analysis_id
     and user_id = auth.uid()
     and deleted_at is null;
end;
$$;

-- Restore function for admins (or self within retention window)
create or replace function public.restore_analysis(p_analysis_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Only admins or the owner can restore
  if not is_admin() then
    raise exception 'Only administrators can restore deleted analyses';
  end if;

  update public.analyses
     set deleted_at = null,
         deleted_by = null
   where id = p_analysis_id;
end;
$$;

-- Hard delete function (admin only, for GDPR/retention compliance)
-- This permanently removes the record
create or replace function public.hard_delete_analysis(p_analysis_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only administrators can permanently delete analyses';
  end if;

  delete from public.analyses where id = p_analysis_id;
end;
$$;

commit;
