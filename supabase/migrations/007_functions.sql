-- 007_functions.sql
-- AUTHENTIQ: secure dashboard aggregation helpers.
-- Built with security invoker so Row Level Security of the caller applies to
-- every inner query — functions never bypass intended authorization.

begin;

create or replace function public.get_dashboard_stats()
returns table (
  total bigint,
  authentic bigint,
  suspicious bigint,
  manipulated bigint,
  inconclusive bigint,
  requires_review bigint,
  processing bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with owned as (
    select verdict, status
    from public.analyses
    where user_id = auth.uid()
  )
  select
    count(*)::bigint,
    count(*) filter (where verdict = 'authentic')::bigint,
    count(*) filter (where verdict = 'suspicious')::bigint,
    count(*) filter (where verdict = 'manipulated')::bigint,
    count(*) filter (where verdict = 'inconclusive')::bigint,
    (count(*) filter (where verdict = 'suspicious') + count(*) filter (where verdict = 'inconclusive'))::bigint,
    count(*) filter (where status in ('created', 'queued', 'processing'))::bigint
  from owned;
$$;

-- Simple weekly activity trend for the dashboard chart.
create or replace function public.get_analysis_trend(p_days integer default 30)
returns table (
  day date,
  total bigint,
  suspicious bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    created_at::date as day,
    count(*)::bigint as total,
    count(*) filter (where verdict in ('suspicious', 'manipulated', 'inconclusive'))::bigint as suspicious
  from public.analyses
  where user_id = auth.uid()
    and created_at >= now() - make_interval(days => p_days)
  group by created_at::date
  order by day asc;
$$;

commit;