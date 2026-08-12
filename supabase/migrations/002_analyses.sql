-- 002_analyses.sql
-- AUTHENTIQ: analyses, analysis_jobs and media_files.

begin;

-- ------------------------------------------------------------ analyses
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  case_id text unique,
  media_type public.media_type not null,
  filename text,
  status public.analysis_status_type not null default 'created',
  verdict public.verdict_type,
  confidence numeric check (confidence between 0 and 1),
  confidence_lower numeric check (confidence_lower between 0 and 1),
  confidence_upper numeric check (confidence_upper between 0 and 1),
  processing_time_ms integer check (processing_time_ms >= 0),
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

comment on column public.analyses.user_id is
  'Owner. Must equal auth.uid() (the server derives identity from the JWT).';
comment on column public.analyses.case_id is
  'Human-friendly case reference, e.g. VID-2026-00182.';

create table public.analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  job_type text not null default 'forensic-analysis',
  status public.job_status_type not null default 'queued',
  progress integer not null default 0 check (progress between 0 and 100),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- ------------------------------------------------------------ media_files
create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.analyses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- e.g. media/{user_id}/{analysis_id}/original — never a raw filesystem path
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  file_size bigint not null default 0 check (file_size >= 0),
  sha256 text check (sha256 ~ '^[a-f0-9]{64}$'),
  duration_seconds numeric check (duration_seconds >= 0),
  width integer check (width >= 0),
  height integer check (height >= 0),
  created_at timestamptz not null default now()
);

create trigger analyses_set_updated_at
  before update on public.analyses
  for each row execute function public.set_updated_at();

create trigger analysis_jobs_set_updated_at
  before update on public.analysis_jobs
  for each row execute function public.set_updated_at();

commit;