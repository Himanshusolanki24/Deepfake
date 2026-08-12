-- 003_evidence.sql
-- AUTHENTIQ: forensic signal results, evidence, suspicious frames, metadata,
-- reports, api_keys and audit_logs.

begin;

-- ------------------------------------------------------------ signal_results
create table public.signal_results (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  signal_type text not null,
  score numeric check (score between 0 and 1),
  confidence numeric check (confidence between 0 and 1),
  severity public.severity_type not null default 'low',
  status text not null default 'available',
  explanation text,
  model_name text,
  model_version text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ evidence
create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  signal_result_id uuid references public.signal_results (id) on delete set null,
  type text not null,
  title text,
  description text,
  score numeric check (score between 0 and 1),
  confidence numeric check (confidence between 0 and 1),
  frame_number integer check (frame_number >= 0),
  timestamp_start numeric check (timestamp_start >= 0),
  timestamp_end numeric check (timestamp_end >= 0),
  artifact_path text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ suspicious_frames
create table public.suspicious_frames (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  frame_number integer not null check (frame_number >= 0),
  timestamp_seconds numeric not null check (timestamp_seconds >= 0),
  score numeric not null default 0 check (score between 0 and 1),
  image_path text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ metadata_records
create table public.metadata_records (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null unique references public.analyses (id) on delete cascade,
  exif jsonb,
  c2pa jsonb,
  codec text,
  software text,
  creation_time timestamptz,
  modification_time timestamptz,
  compression_info jsonb,
  created_at timestamptz not null default now()
);

comment on table public.metadata_records is
  'Stores only genuinely variable forensic metadata; core searchable fields remain relational columns.';

-- ------------------------------------------------------------ reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'generated',
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ api_keys
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.api_keys is
  'Only hashes/prefixes of API keys are stored. The plaintext key is shown once at creation.';

-- ------------------------------------------------------------ audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Security-sensitive action log. Never stores passwords, tokens or secrets.';

-- ------------------------------------------------------------ audit helper
create function public.write_audit_log(
  p_user_id uuid,
  p_action text,
  p_resource_type text default null,
  p_resource_id text default null,
  p_metadata jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (p_user_id, p_action, p_resource_type, p_resource_id, p_metadata);
end;
$$;

commit;