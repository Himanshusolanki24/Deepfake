-- 006_storage_policies.sql
-- AUTHENTIQ: private storage buckets + ownership policies on storage.objects.
-- All buckets are PRIVATE. Users only access paths under their own uid.

begin;

-- ------------------------------------------------------------ buckets
insert into storage.buckets (id, name, public)
values
  ('media', 'media', false),
  ('evidence', 'evidence', false),
  ('reports', 'reports', false)
on conflict (id) do nothing;

-- ------------------------------------------------------------ helper
-- Extracts the owner id segment from a storage path:
--   media/{user_id}/{analysis_id}/...  -> {user_id}
create or replace function public.storage_owner_id(name text)
returns text
language sql
immutable
as $$
  select split_part(name, '/', 1);
$$;

-- ------------------------------------------------------------ media bucket
create policy "Users can view own media objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'media' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can upload own media objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can update own media objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.storage_owner_id(name) = auth.uid()::text)
  with check (bucket_id = 'media' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can delete own media objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.storage_owner_id(name) = auth.uid()::text);

-- ------------------------------------------------------------ evidence bucket
create policy "Users can view own evidence objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'evidence' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can upload own evidence objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'evidence' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can update own evidence objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'evidence' and public.storage_owner_id(name) = auth.uid()::text)
  with check (bucket_id = 'evidence' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can delete own evidence objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'evidence' and public.storage_owner_id(name) = auth.uid()::text);

-- ------------------------------------------------------------ reports bucket
create policy "Users can view own report objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'reports' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can upload own report objects"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reports' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can update own report objects"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'reports' and public.storage_owner_id(name) = auth.uid()::text)
  with check (bucket_id = 'reports' and public.storage_owner_id(name) = auth.uid()::text);

create policy "Users can delete own report objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reports' and public.storage_owner_id(name) = auth.uid()::text);

-- ------------------------------------------------------------ cleanup
-- Deleting an analysis must explicitly clean its storage objects. Postgres
-- cascades do NOT remove Supabase Storage objects automatically.
create or replace function public.purge_analysis_objects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from storage.objects
   where bucket_id in ('media', 'evidence', 'reports')
     and owner = old.user_id
     and name like old.user_id::text || '/%';
  return old;
end;
$$;

create trigger purge_analysis_storage_after_delete
  after delete on public.analyses
  for each row execute function public.purge_analysis_objects();

commit;