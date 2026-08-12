-- 009_usage_tracking.sql
-- AUTHENTIQ: Usage tracking for rate limiting and subscription tier enforcement.
-- Tracks analysis counts per user per billing period.

begin;

-- ------------------------------------------------------------ usage_records
create table public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  analysis_count integer not null default 0 check (analysis_count >= 0),
  storage_bytes bigint not null default 0 check (storage_bytes >= 0),
  tier text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_user_period unique (user_id, period_start)
);

comment on table public.usage_records is
  'Monthly usage records per user for rate limiting and billing. One row per billing period.';

create trigger usage_records_set_updated_at
  before update on public.usage_records
  for each row execute function public.set_updated_at();

-- Indexes for usage lookups
create index usage_records_user_period_idx on public.usage_records (user_id, period_start desc);
create index usage_records_period_idx on public.usage_records (period_start, period_end);

-- ------------------------------------------------------------ RLS policies
alter table public.usage_records enable row level security;

create policy "Users can view own usage records"
  on public.usage_records for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own usage records"
  on public.usage_records for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own usage records"
  on public.usage_records for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ helper functions
-- Get or create the current billing period record for a user
create or replace function public.get_or_create_usage_record(p_user_id uuid)
returns public.usage_records
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec public.usage_records;
  period_start_val timestamptz;
  period_end_val timestamptz;
begin
  -- Calculate billing period (monthly, starting from the 1st)
  period_start_val := date_trunc('month', now());
  period_end_val := period_start_val + interval '1 month';

  -- Try to get existing record
  select * into rec
  from public.usage_records
  where user_id = p_user_id
    and period_start = period_start_val;

  -- If not found, create it
  if not found then
    insert into public.usage_records (user_id, period_start, period_end)
    values (p_user_id, period_start_val, period_end_val)
    returning * into rec;
  end if;

  return rec;
end;
$$;

-- Increment analysis count for a user
create or replace function public.increment_analysis_count(p_user_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.usage_records (user_id, period_start, period_end, analysis_count)
  select
    p_user_id,
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    1
  on conflict (user_id, period_start)
  do update set
    analysis_count = usage_records.analysis_count + 1,
    updated_at = now();
end;
$$;

-- Add storage bytes for a user
create or replace function public.add_storage_usage(p_user_id uuid, p_bytes bigint)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.usage_records (user_id, period_start, period_end, storage_bytes)
  select
    p_user_id,
    date_trunc('month', now()),
    date_trunc('month', now()) + interval '1 month',
    p_bytes
  on conflict (user_id, period_start)
  do update set
    storage_bytes = usage_records.storage_bytes + p_bytes,
    updated_at = now();
end;
$$;

-- Get current usage summary for a user
create or replace function public.get_current_usage()
returns table (
  user_id uuid,
  period_start timestamptz,
  period_end timestamptz,
  analysis_count integer,
  storage_bytes bigint,
  tier text,
  analysis_limit integer,
  storage_limit_gb integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with limits as (
    select
      case tier
        when 'free' then 100
        when 'pro' then 1000
        when 'enterprise' then -1  -- unlimited
        else 100
      end as analysis_limit,
      case tier
        when 'free' then 5
        when 'pro' then 50
        when 'enterprise' then -1  -- unlimited
        else 5
      end as storage_limit_gb
    from public.usage_records
    where user_id = auth.uid()
      and period_start = date_trunc('month', now())
    limit 1
  )
  select
    ur.user_id,
    ur.period_start,
    ur.period_end,
    ur.analysis_count,
    ur.storage_bytes,
    ur.tier,
    l.analysis_limit,
    l.storage_limit_gb
  from public.usage_records ur
  cross join limits l
  where ur.user_id = auth.uid()
    and ur.period_start = date_trunc('month', now());
$$;

commit;
