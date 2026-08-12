-- 001_enums_and_profiles.sql
-- AUTHENTIQ: domain enums + profiles table + automatic profile creation on signup.

begin;

-- ------------------------------------------------------------ enums
create type public.role as enum ('user', 'analyst', 'admin');

create type public.media_type as enum ('image', 'video', 'audio');

create type public.verdict_type as enum ('authentic', 'suspicious', 'manipulated', 'inconclusive');

create type public.analysis_status_type as enum (
  'created',
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create type public.job_status_type as enum (
  'queued',
  'processing',
  'completed',
  'failed',
  'cancelled'
);

create type public.severity_type as enum ('low', 'medium', 'high');

-- ------------------------------------------------------------ profiles
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application profile mirroring an auth.users row. Created by trigger; never client-inserted.';
comment on column public.profiles.role is
  'Authorization-level role. Kept in app_metadata-compatible trusted storage, not raw_user_meta_data.';

-- ------------------------------------------------------------ profile trigger
-- Every auth user automatically gets a profile row. The client must never
-- be trusted to create its own profile.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile email in sync with auth.users.email.
create function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email = new.email,
         updated_at = now()
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- ------------------------------------------------------------ updated_at helper
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

commit;