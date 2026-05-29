-- KUSQA Security Hardening: fix profiles RLS
--
-- profiles is the most sensitive user data table.
-- Prior to this migration, RLS was NOT ENABLED on profiles, meaning any
-- authenticated user could read or modify any profile row.
--
-- This migration enables RLS and enforces per-user isolation.

-- Enable RLS (idempotent)
alter table if exists public.profiles enable row level security;

-- SELECT: users can only read their own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- UPDATE: users can only update their own profile rows
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

comment on table public.profiles is 'User profiles; RLS enforced — users can only access their own row.';
