-- KUSQA Phase 4B: proposal support fan-out + delta RPC
--
-- Architecture (see ADR-0001):
--   proposal_supports INSERT
--     → trigger public.trg_fanout_proposal_support
--       → public.append_civic_event(kind='proposal.supported', ...)
--         → realtime bridge picks up civic_events INSERT
--           → dispatches 'proposal.support_changed' domain event
--             → invalidates [proposals, detail, proposalId] + [proposal-coalition, ...]
--
-- Why a separate RPC for the delta read
--   The realtime bridge may miss events (network blips, reconnection
--   windows). On reconnect, it asks the server "what changed since
--   X?" via `get_proposal_support_delta(p_proposal_id, p_since)`. The
--   server returns the new support count, so the client can reconcile
--   without re-fetching the full proposal row.
--
-- All operations are idempotent (CREATE OR REPLACE, DROP TRIGGER IF
-- EXISTS, CREATE INDEX IF NOT EXISTS).

set search_path = public;

-- ─── 1. get_proposal_support_delta RPC ──────────────────────────────────
-- Returns the support count for a proposal as of `p_since` and the
-- current support count. The client computes the delta. If `p_since`
-- is null, returns the current count only (used for first-connect
-- reconciliation).
create or replace function public.get_proposal_support_delta(
  p_proposal_id uuid,
  p_since       timestamptz default null
) returns table (
  proposal_id      uuid,
  current_count    bigint,
  supports_since   bigint,
  last_support_at  timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p_proposal_id as proposal_id,
    (select count(*) from public.proposal_supports where proposal_id = p_proposal_id) as current_count,
    case
      when p_since is null then 0
      else (
        select count(*)
        from public.proposal_supports
        where proposal_id = p_proposal_id
          and created_at >= p_since
      )
    end as supports_since,
    (select max(created_at) from public.proposal_supports where proposal_id = p_proposal_id) as last_support_at;
$$;

revoke all on function public.get_proposal_support_delta(uuid, timestamptz) from public;
grant execute on function public.get_proposal_support_delta(uuid, timestamptz) to anon, authenticated;

-- ─── 2. Fan-out trigger ─────────────────────────────────────────────────
-- On INSERT to proposal_supports, append a 'proposal.supported' event
-- to civic_events. We use a server-side SECURITY DEFINER function so
-- the client never needs to write to civic_events directly.
create or replace function public.trg_fanout_proposal_support()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_district_id uuid;
  v_event_id uuid;
  v_dedupe text;
begin
  -- Resolve district from the proposal so the timeline chip
  -- ("Propuesta apoyada · Rímac") is accurate.
  select district_id into v_proposal_district_id
  from public.proposals
  where id = NEW.proposal_id;

  -- dedupe key: per-(proposal, user) so re-firing the trigger does
  -- not double-write. The append_civic_event function is itself
  -- idempotent on dedupe_key, so this is belt-and-suspenders.
  v_dedupe := 'proposal.supported:' || NEW.proposal_id::text || ':' || NEW.user_id::text;

  v_event_id := public.append_civic_event(
    p_kind        := 'proposal.supported'::public.civic_event_kind,
    p_actor_id    := NEW.user_id,
    p_target_type := 'proposal',
    p_target_id   := NEW.proposal_id,
    p_district_id := v_proposal_district_id,
    p_payload     := jsonb_build_object('support_id', NEW.id),
    p_dedupe_key  := v_dedupe
  );

  return NEW;
end;
$$;

drop trigger if exists trg_fanout_proposal_support on public.proposal_supports;
create trigger trg_fanout_proposal_support
  after insert on public.proposal_supports
  for each row
  execute function public.trg_fanout_proposal_support();
