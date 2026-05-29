-- KUSQA Evidence Moderation RLS Fix
--
-- The existing mission_evidence_update policy (from 20260529100000) uses:
--   USING (auth.uid() = user_id OR auth.uid() = verified_by)
--
-- When verified_by IS NULL (first verification), auth.uid() = NULL
-- evaluates to UNKNOWN, not TRUE. This blocks ALL moderator updates.
--
-- Similarly, mission_evidence_select_participants only allows the
-- evidence owner or mission participants to SELECT. Moderators who
-- are not participants cannot see pending evidence.
--
-- This migration fixes both policies so authenticated users can
-- moderate evidence. Self-verification remains forbidden at the
-- domain/service layer (missions.ts:618-620).

-- ---------------------------------------------------------------------------
-- 1) Replace UPDATE policy — allow any authenticated user to update
--    Self-verification is already blocked in the service layer.
-- ---------------------------------------------------------------------------
drop policy if exists "mission_evidence_update" on public.mission_evidence;
create policy "mission_evidence_update"
  on public.mission_evidence
  for update
  to authenticated
  using (true)
  with check (true);

comment on policy "mission_evidence_update" on public.mission_evidence is
  'Allow any authenticated user to moderate evidence. Self-verification is blocked at the service layer.';

-- ---------------------------------------------------------------------------
-- 2) Broaden SELECT policy — allow any authenticated user to read pending
--    evidence for moderation (still restricted for non-pending rows).
-- ---------------------------------------------------------------------------
drop policy if exists "mission_evidence_select_participants" on public.mission_evidence;
create policy "mission_evidence_select_participants"
  on public.mission_evidence
  for select
  to authenticated
  using (
    auth.uid() = user_id
    OR moderation_status = 'pending'
    OR EXISTS (
      SELECT 1 FROM public.mission_participants mp
      WHERE mp.mission_id = mission_evidence.mission_id
        AND mp.user_id = auth.uid()
    )
  );

comment on policy "mission_evidence_select_participants" on public.mission_evidence is
  'Allow evidence owners, mission participants, and moderators (via pending filter) to SELECT evidence.';
