-- Allows the very first profile row ever created to be self-inserted as
-- owner (bootstrap case), since is_owner() can never be true before any
-- owner profile exists. After that first row, only an existing owner can
-- insert further profiles (unchanged from 0001_init.sql).
drop policy if exists "profiles: owners can insert profiles" on public.profiles;

create policy "profiles: owners or bootstrap can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (
    public.is_owner()
    or not exists (select 1 from public.profiles)
  );
