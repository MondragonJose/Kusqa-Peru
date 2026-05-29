-- Fix RLS policies for mission_participants, missions, and user_progress.
--
-- Root causes addressed:
--   1. mission_participants had RLS enabled but the INSERT policy either
--      didn't exist or the `auth.uid()` comparison failed silently
--   2. missions table had NO RLS at all — any operation was permitted
--      to any authenticated role, but 406 errors came from .single()
--      throwing PGRST116 on empty results, not from RLS
--   3. user_progress had NO RLS
--
-- Approach: use DROP POLICY IF EXISTS + CREATE POLICY for clean idempotency
-- rather than conditional do $$ blocks, which have subtle scoping issues.

-- ============================================================================
-- 1. mission_participants — ensure all three policies exist
-- ============================================================================

-- Ensure RLS is enabled (idempotent)
alter table if exists public.mission_participants enable row level security;

-- SELECT: users can only read their own participation rows
drop policy if exists "Users can read own participation" on public.mission_participants;
create policy "Users can read own participation"
  on public.mission_participants
  for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT: users can only insert rows where user_id matches their auth.uid()
-- auth.uid() returns uuid, user_id must be uuid — PostgREST handles string→uuid
drop policy if exists "Users can join missions" on public.mission_participants;
create policy "Users can join missions"
  on public.mission_participants
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: users can only update their own participation rows
drop policy if exists "Users can update own participation" on public.mission_participants;
create policy "Users can update own participation"
  on public.mission_participants
  for update
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- 2. missions — add RLS with public SELECT for authenticated users
-- ============================================================================

alter table if exists public.missions enable row level security;

-- All authenticated users can read the mission catalog
drop policy if exists "missions_select_authenticated" on public.missions;
create policy "missions_select_authenticated"
  on public.missions
  for select
  to authenticated
  using (true);

-- ============================================================================
-- 3. user_progress — add RLS so users can see/update only their progress
-- ============================================================================

alter table if exists public.user_progress enable row level security;

-- SELECT: users can read their own progress
drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own"
  on public.user_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

-- UPDATE: users can update their own progress (e.g. when completing missions)
drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own"
  on public.user_progress
  for update
  to authenticated
  using (auth.uid() = user_id);
