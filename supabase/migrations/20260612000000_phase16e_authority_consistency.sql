-- KUSQA Phase 16E — Authority Consistency Audit Implementation
--
-- Fixes three RLS gaps identified in the audit:
--   1. mission_evidence has RLS enabled but NO INSERT policy
--   2. mission_evidence UPDATE uses USING (true) — replaces with
--      proper ownership/moderator check that avoids the NULL verified_by bug
--   3. user_missions has RLS enabled but all policies are only SQL comments
--
-- design:
--   - Additive where possible (DROP IF EXISTS / CREATE OR REPLACE)
--   - mission_evidence INSERT: scoped to auth.uid() = user_id
--   - mission_evidence UPDATE: scoped to owner OR assigned verifier,
--     with NULL-safe equality for verified_by
--   - user_missions: recreate three commented-out policies as real policies

-- ---------------------------------------------------------------------------
-- 1) mission_evidence INSERT policy
-- ---------------------------------------------------------------------------
-- The table had RLS enabled since 20260526120000 but the insert_own policy
-- was only created on storage.objects, not on public.mission_evidence.
-- Without this policy, every evidence submission is blocked by RLS default
-- deny, making the entire completion flow inoperable.

create policy "mission_evidence_insert_own"
  on public.mission_evidence
  for insert
  to authenticated
  with check (auth.uid() = user_id);

comment on policy "mission_evidence_insert_own" on public.mission_evidence is
  'Users can only insert evidence rows where user_id matches their session.';


-- ---------------------------------------------------------------------------
-- 2) Replace permissive evidence UPDATE policy
-- ---------------------------------------------------------------------------
-- The previous fix (20260602000000) used USING (true) / WITH CHECK (true) to
-- work around a PostgreSQL NULL-equality issue: when verified_by IS NULL,
-- the expression auth.uid() = verified_by evaluates to UNKNOWN (not TRUE),
-- blocking legitimate moderator updates.
--
-- This replacement uses (auth.uid() = user_id OR auth.uid() IS NOT DISTINCT
-- FROM verified_by). IS NOT DISTINCT FROM treats NULL as a comparable value
-- (NULL IS NOT DISTINCT FROM NULL → true, 'x' IS NOT DISTINCT FROM NULL →
-- false), so:
--   - evidence owners can still update their pending rows
--   - the first moderator to claim a row (when verified_by IS NULL) can update
--   - subsequent moderators (when verified_by IS NOT NULL) are gated by
--     auth.uid() = verified_by
-- Self-verification is blocked by the service layer in missions.ts:716-718.

drop policy if exists "mission_evidence_update" on public.mission_evidence;

create policy "mission_evidence_update"
  on public.mission_evidence
  for update
  to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() is not distinct from verified_by
  )
  with check (
    auth.uid() = user_id
    or auth.uid() is not distinct from verified_by
  );

comment on policy "mission_evidence_update" on public.mission_evidence is
  'Evidence owner or assigned verifier (NULL-safe) can update. Self-verification blocked at service layer.';


-- ---------------------------------------------------------------------------
-- 3) Restore user_missions policies
-- ---------------------------------------------------------------------------
-- The table has RLS enabled but all three CREATE POLICY statements existed
-- only as SQL comments (20260523120000_create_user_missions.sql lines 22-24).
-- All access currently goes through SECURITY DEFINER RPCs; these policies
-- enable direct client queries for future use (e.g., dashboard counters).
-- The RPC flows remain authoritative — these policies add defense-in-depth.

drop policy if exists "user_missions_select_own" on public.user_missions;
create policy "user_missions_select_own"
  on public.user_missions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_missions_insert_own" on public.user_missions;
create policy "user_missions_insert_own"
  on public.user_missions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_missions_update_own" on public.user_missions;
create policy "user_missions_update_own"
  on public.user_missions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.user_missions is
  'User-mission join table; RLS enforces own-row scope. RPCs remain the authoritative write path.';
