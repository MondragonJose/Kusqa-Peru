-- KUSQA Evidence & Verification System
-- Adds verification fields, evidence types, and RLS to mission_evidence.
-- Depends on: 20260526120000_phase_b_operational_readiness.sql (creates base mission_evidence)

-- ---------------------------------------------------------------------------
-- 1) Add evidence type — distinguishes photo/text/checkpoint/mixed evidence
-- ---------------------------------------------------------------------------
ALTER TABLE public.mission_evidence
  ADD COLUMN IF NOT EXISTS evidence_type text NOT NULL DEFAULT 'photo'
    CHECK (evidence_type IN ('photo', 'text', 'checkpoint', 'mixed'));

-- ---------------------------------------------------------------------------
-- 2) Add description — text content for non-photo evidence, optional for photos
-- ---------------------------------------------------------------------------
ALTER TABLE public.mission_evidence
  ADD COLUMN IF NOT EXISTS description text;

-- ---------------------------------------------------------------------------
-- 3) Add media_urls — signed URL array for photo/mixed evidence, empty for text
-- ---------------------------------------------------------------------------
ALTER TABLE public.mission_evidence
  ADD COLUMN IF NOT EXISTS media_urls text[] DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 4) Add location metadata (future-ready — nullable, optional)
-- ---------------------------------------------------------------------------
ALTER TABLE public.mission_evidence
  ADD COLUMN IF NOT EXISTS location_lat numeric,
  ADD COLUMN IF NOT EXISTS location_lng numeric;

-- ---------------------------------------------------------------------------
-- 5) Add verification fields
-- ---------------------------------------------------------------------------
ALTER TABLE public.mission_evidence
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- ---------------------------------------------------------------------------
-- 6) Indexes for verification queries
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS mission_evidence_verification_idx
  ON public.mission_evidence (moderation_status, verified_at NULLS FIRST)
  WHERE moderation_status = 'pending';

CREATE INDEX IF NOT EXISTS mission_evidence_verified_by_idx
  ON public.mission_evidence (verified_by)
  WHERE verified_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 7) RLS policies
--    Existing: select_own, insert_own, delete_own (from phase_b)
--    New: select_mission_participants, update_verification
-- ---------------------------------------------------------------------------

-- Allow mission participants to see each other's evidence (contribution feed)
CREATE POLICY "mission_evidence_select_participants"
  ON public.mission_evidence FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.mission_participants mp
      WHERE mp.mission_id = mission_evidence.mission_id
        AND mp.user_id = auth.uid()
    )
  );

-- Allow evidence creators and verifiers to update
-- Verifiers can set verification_status, verified_at, verified_by, rejection_reason
-- Creators can update description, media_urls (only while pending)
CREATE POLICY "mission_evidence_update"
  ON public.mission_evidence FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = verified_by
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = verified_by
  );

-- ---------------------------------------------------------------------------
-- 8) Drop overly restrictive old policies (select_own prevents mission feed)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "mission_evidence_select_own" ON public.mission_evidence;
DROP POLICY IF EXISTS "mission_evidence_delete_own" ON public.mission_evidence;

-- ---------------------------------------------------------------------------
-- 9) Enable realtime for evidence (so mission feeds update live)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.mission_evidence;

COMMENT ON COLUMN public.mission_evidence.evidence_type IS 'Type of evidence: photo (upload), text (description only), checkpoint (location check-in), mixed (photo + text)';
COMMENT ON COLUMN public.mission_evidence.media_urls IS 'Signed URL array for photo/mixed evidence';
COMMENT ON COLUMN public.mission_evidence.verified_by IS 'User who verified this evidence (self-verification forbidden)';
COMMENT ON COLUMN public.mission_evidence.verified_at IS 'When verification occurred';
COMMENT ON COLUMN public.mission_evidence.rejection_reason IS 'Reason for rejection (visible to evidence creator)';
