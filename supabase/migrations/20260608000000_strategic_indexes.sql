-- 10F.3 — Strategic Indexes for Territorial Scalability
--
-- Phase 10F audit findings: the most impactful indexes target
-- 1) district feed filtering (the ILIKE replacement path),
-- 2) support counting (most frequent aggregation),
-- 3) feed ordering (created_at desc),
-- 4) lifecycle event lookups,
-- 5) completion counting.
--
-- Every index here is justified by a specific query path identified
-- during the 10F.1 audit. No speculative indexing.

-- ───── proposals ─────────────────────────────────────────────────────────

-- Primary FK for district feeds — enables eq("district_id", X) without seq scan
create index if not exists idx_proposals_district_id
  on public.proposals (district_id);

-- Feed ordering — all proposal feeds sort by created_at desc
create index if not exists idx_proposals_created_at
  on public.proposals (created_at desc);

-- Composite: district + status — powers district feed filtering for
-- active/pending proposals without filtering all proposals first
create index if not exists idx_proposals_district_status
  on public.proposals (district_id, status);

-- User proposals — profile pages listing a user's proposals
create index if not exists idx_proposals_user_id
  on public.proposals (user_id);

-- ───── mission_participants ──────────────────────────────────────────────

-- Completion counting — getRecentCompletionCount filters by completed_at
create index if not exists idx_mission_participants_completed
  on public.mission_participants (completed_at)
  where completed_at is not null;

-- Participant counting per mission
create index if not exists idx_mission_participants_mission_id
  on public.mission_participants (mission_id);

-- ───── proposal_supports ─────────────────────────────────────────────────

-- Support counting — the most frequent count query in the system
create index if not exists idx_proposal_supports_proposal_id
  on public.proposal_supports (proposal_id);

-- Unique support check + per-user support listing
create unique index if not exists idx_proposal_supports_proposal_user
  on public.proposal_supports (proposal_id, user_id);

-- ───── proposal_collaborators ────────────────────────────────────────────

-- Accepted collaborator counting per proposal
create index if not exists idx_proposal_collaborators_proposal
  on public.proposal_collaborators (proposal_id, status);

-- ───── proposal_lifecycle_events ─────────────────────────────────────────

-- Lifecycle event listing per proposal
create index if not exists idx_proposal_lifecycle_events_proposal
  on public.proposal_lifecycle_events (proposal_id, created_at desc);

-- ───── civic_events ──────────────────────────────────────────────────────

-- Profile timeline queries (get_civic_events_for_profile RPC)
create index if not exists idx_civic_events_target
  on public.civic_events (target_type, target_id, occurred_at desc);

-- ───── missions ──────────────────────────────────────────────────────────

-- Feed ordering for mission listings
create index if not exists idx_missions_created_at
  on public.missions (created_at desc);

-- ───── district_stats view (underlying tables already covered above) ─────
-- The district_stats view aggregates from proposals, missions,
-- mission_participants, and proposal_collaborators — all of which are
-- now indexed for the relevant columns.
