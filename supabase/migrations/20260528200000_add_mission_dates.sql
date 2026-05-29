-- Add temporal structure to missions and proposals.
-- Missions get start_date/end_date for time-bound civic actions.
-- Proposals get optional proposed_date for time horizon.
--
-- Changes:
--   1. missions: add start_date, end_date (nullable)
--   2. proposals: add proposed_date (nullable)
--
-- All done via IF NOT EXISTS — safe to re-run, no existing rows broken.

-- ============================================================================
-- 1. missions — add start_date and end_date
-- ============================================================================

alter table if exists public.missions
  add column if not exists start_date timestamptz,
  add column if not exists end_date timestamptz;

-- Set start_date = created_at for existing rows so temporal status
-- ("upcoming" / "active" / "completed") works retroactively
update public.missions
  set start_date = created_at
  where start_date is null;

-- ============================================================================
-- 2. proposals — add optional proposed_date
-- ============================================================================

alter table if exists public.proposals
  add column if not exists proposed_date timestamptz;
