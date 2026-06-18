-- Create storage bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own avatar
drop policy if exists "Avatar upload own" on storage.objects;
create policy "Avatar upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow anyone to view avatars (public bucket)
drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

-- Allow users to update their own avatar
drop policy if exists "Avatar update own" on storage.objects;
create policy "Avatar update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatar
drop policy if exists "Avatar delete own" on storage.objects;
create policy "Avatar delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
