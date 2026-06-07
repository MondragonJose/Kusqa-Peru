-- KUSQA Phase 4B: proposal_supports realtime publication
--
-- Scope is intentionally narrow: ONLY `proposal_supports` joins the
-- realtime publication in this phase. proposal_comments,
-- proposal_collaborators, proposal_lifecycle_events stay polled
-- until query-key semantics for invalidation stabilize.
--
-- We do NOT add the trigger here. The fan-out from `proposal_supports`
-- into `civic_events` is in 20260607040000_proposal_support_event_rpc.sql
-- so the two concerns (publication membership, fan-out logic) stay
-- in separate migrations.
--
-- All operations are idempotent: the publication `add table` is
-- guarded by an `if not exists` check.

set search_path = public;

-- ─── 1. Supporting index: per-proposal support deltas ────────────────────
-- The realtime bridge may receive many events for a single proposal in
-- a short window (e.g. a coalition campaign). An index on
-- (proposal_id, created_at desc) keeps the bridge's "is this newer
-- than my last seen?" check cheap.
create index if not exists proposal_supports_proposal_created_idx
  on public.proposal_supports (proposal_id, created_at desc);

-- ─── 2. Add to realtime publication ──────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'proposal_supports'
    ) then
      alter publication supabase_realtime add table public.proposal_supports;
    end if;
  end if;
end $$;
