-- KUSQA: proposal → mission conversion (Phase 3B).
--
-- Adds the load-bearing schema for the ceremonial transition:
--   1) proposals.has_converted_mission_id   — idempotency marker
--   2) missions.source_proposal_id          — reverse link (mission → proposal)
--   3) proposal_lifecycle_events            — append-only audit log
--   4) convert_proposal_to_mission RPC      — atomic, organizer-confirmed
--   5) reopen_proposal RPC                  — author-only undo (post-conversion grace)
--
-- Conversion flow (per the spec):
--   - threshold reached:  proposal becomes "ready" (purely derived, no DB write)
--   - author sees CTA:    "Tu iniciativa ya puede convertirse en misión"
--   - author confirms:    calls convert_proposal_to_mission RPC
--   - RPC atomically:
--       a) inserts a new mission row with source_proposal_id
--       b) sets proposal.status = 'resolved'
--       c) sets proposal.has_converted_mission_id = new_mission_id
--       d) inserts a 'mission_created' event into proposal_lifecycle_events
--   - proposal detail page now shows the conversion history (lifecycle events)
--
-- The conversion is *not* auto-triggered. It is gated on the author's
-- confirmation. This preserves intentionality and ceremony.

-- ===========================================================================
-- 1) proposals.has_converted_mission_id
-- ===========================================================================

alter table public.proposals
  add column if not exists has_converted_mission_id uuid null
    references public.missions(id) on delete set null;

create index if not exists proposals_has_converted_mission_id_idx
  on public.proposals (has_converted_mission_id)
  where has_converted_mission_id is not null;

comment on column public.proposals.has_converted_mission_id is
  'When a proposal is converted to a mission, this points to the resulting mission. NULL means not yet converted. Acts as the idempotency marker for the convert RPC.';

-- ===========================================================================
-- 2) missions.source_proposal_id
-- ===========================================================================

alter table public.missions
  add column if not exists source_proposal_id uuid null
    references public.proposals(id) on delete set null;

create index if not exists missions_source_proposal_id_idx
  on public.missions (source_proposal_id)
  where source_proposal_id is not null;

comment on column public.missions.source_proposal_id is
  'When a mission was created from a proposal, this points to the originating proposal. NULL for missions that did not originate from a proposal.';

-- ===========================================================================
-- 3) proposal_lifecycle_events — append-only audit log
-- ===========================================================================

create type public.proposal_lifecycle_event_type as enum (
  'coalition_threshold_reached',
  'organizer_confirmed',
  'mission_created',
  'proposal_locked',
  'proposal_reopened'
);

create table if not exists public.proposal_lifecycle_events (
  id                    uuid primary key default gen_random_uuid(),
  proposal_id           uuid not null references public.proposals(id) on delete cascade,
  event_type            public.proposal_lifecycle_event_type not null,
  actor_id              uuid null references public.profiles(id) on delete set null,
  from_status           text null,
  to_status             text null,
  converted_mission_id  uuid null references public.missions(id) on delete set null,
  payload               jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

create index if not exists proposal_lifecycle_events_proposal_idx
  on public.proposal_lifecycle_events (proposal_id, created_at desc);
create index if not exists proposal_lifecycle_events_actor_idx
  on public.proposal_lifecycle_events (actor_id, created_at desc);
create index if not exists proposal_lifecycle_events_converted_mission_idx
  on public.proposal_lifecycle_events (converted_mission_id)
  where converted_mission_id is not null;

alter table public.proposal_lifecycle_events enable row level security;

-- SELECT: any authenticated user. The lifecycle is a public civic timeline.
drop policy if exists "proposal_lifecycle_events_select_authenticated" on public.proposal_lifecycle_events;
create policy "proposal_lifecycle_events_select_authenticated"
  on public.proposal_lifecycle_events for select
  to authenticated
  using (true);

-- INSERT: only SECURITY DEFINER RPCs may write (no INSERT for `authenticated`).
-- This preserves the audit log's integrity: every row was written by the server.

comment on table public.proposal_lifecycle_events is
  'Append-only audit log for proposal lifecycle transitions. Public-readable. Insert only via SECURITY DEFINER RPCs (convert_proposal_to_mission, reopen_proposal).';

-- ===========================================================================
-- 4) convert_proposal_to_mission RPC
--    Atomic, idempotent, organizer-confirmed.
--    Inputs: p_proposal_id, p_initial_date (optional), p_organizer_notes (optional)
--    Returns: the new mission_id (uuid) or raises an exception with a code
-- ===========================================================================

create or replace function public.convert_proposal_to_mission(
  p_proposal_id uuid,
  p_initial_date timestamptz default null,
  p_organizer_notes text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_proposal proposals%rowtype;
  v_new_mission_id uuid;
  v_threshold integer;
  v_support_count integer;
  v_collaborator_count integer;
begin
  if v_actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Lock the proposal row to prevent concurrent conversions.
  select * into v_proposal
  from public.proposals
  where id = p_proposal_id
  for update;

  if v_proposal.id is null then
    raise exception 'PROPOSAL_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Only the author can convert.
  if v_proposal.user_id <> v_actor_id then
    raise exception 'NOT_AUTHOR' using errcode = '42501';
  end if;

  -- Idempotency: if already converted, return the existing mission_id.
  if v_proposal.has_converted_mission_id is not null then
    return v_proposal.has_converted_mission_id;
  end if;

  -- Compute threshold + counts. We trust the existing helpers.
  v_threshold := greatest(3, ceil(v_proposal.team_size * 0.3)::int);

  select count(*) into v_support_count
  from public.proposal_supports
  where proposal_id = p_proposal_id;

  select count(*) into v_collaborator_count
  from public.proposal_collaborators
  where proposal_id = p_proposal_id
    and status = 'accepted';

  -- Conversion gate: status must be 'pending' with threshold met, or 'active'.
  if not (
    (v_proposal.status = 'pending' and v_support_count >= v_threshold)
    or v_proposal.status = 'active'
  ) then
    raise exception 'THRESHOLD_NOT_MET' using errcode = 'P0001';
  end if;

  -- Insert the new mission.
  insert into public.missions (
    title, description, district, category, latitude, longitude,
    organizer_id, start_date, end_date, current_progress, max_participants, xp_reward,
    source_proposal_id
  ) values (
    v_proposal.title,
    v_proposal.description,
    v_proposal.district,
    case v_proposal.category
      when 'Medio ambiente' then 'environment'
      when 'Educación'      then 'education'
      when 'Arte & cultura' then 'community'
      when 'Comunidad'      then 'community'
      when 'Salud'          then 'health'
      when 'Tecnología'     then 'infrastructure'
      else 'community'
    end,
    v_proposal.latitude::double precision,
    v_proposal.longitude::double precision,
    v_actor_id,
    p_initial_date,
    p_initial_date,
    0,
    v_proposal.team_size,
    320,
    v_proposal.id
  )
  returning id into v_new_mission_id;

  -- Update the proposal: resolved + has_converted_mission_id.
  update public.proposals
  set status = 'resolved',
      has_converted_mission_id = v_new_mission_id,
      updated_at = now()
  where id = p_proposal_id;

  -- Log the lifecycle event.
  insert into public.proposal_lifecycle_events (
    proposal_id, event_type, actor_id, from_status, to_status,
    converted_mission_id, payload
  ) values (
    p_proposal_id, 'mission_created', v_actor_id,
    v_proposal.status, 'resolved',
    v_new_mission_id,
    jsonb_build_object(
      'support_count', v_support_count,
      'collaborator_count', v_collaborator_count,
      'threshold', v_threshold,
      'organizer_notes', p_organizer_notes
    )
  );

  return v_new_mission_id;
end;
$$;

revoke all on function public.convert_proposal_to_mission(uuid, timestamptz, text) from public;
grant execute on function public.convert_proposal_to_mission(uuid, timestamptz, text) to authenticated;

comment on function public.convert_proposal_to_mission(uuid, timestamptz, text) is
  'Atomic proposal→mission conversion. Idempotent (returns existing mission_id if already converted). Author-only. Writes proposal_lifecycle_events row.';

-- ===========================================================================
-- 5) reopen_proposal RPC
--    Author-only undo for the post-conversion grace window.
--    Reverts proposal.status back to 'pending' and clears the converted link.
--    The mission row is left intact (history is preserved) but loses the
--    has_converted_mission_id pointer. A new conversion creates a new mission.
-- ===========================================================================

create or replace function public.reopen_proposal(
  p_proposal_id uuid,
  p_reason text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_proposal proposals%rowtype;
begin
  if v_actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  select * into v_proposal
  from public.proposals
  where id = p_proposal_id
  for update;

  if v_proposal.id is null then
    raise exception 'PROPOSAL_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_proposal.user_id <> v_actor_id then
    raise exception 'NOT_AUTHOR' using errcode = '42501';
  end if;

  if v_proposal.has_converted_mission_id is null then
    raise exception 'NOT_CONVERTED' using errcode = 'P0001';
  end if;

  update public.proposals
  set status = 'pending',
      has_converted_mission_id = null,
      updated_at = now()
  where id = p_proposal_id;

  insert into public.proposal_lifecycle_events (
    proposal_id, event_type, actor_id, from_status, to_status, converted_mission_id, payload
  ) values (
    p_proposal_id, 'proposal_reopened', v_actor_id,
    'resolved', 'pending',
    null,
    jsonb_build_object('reason', p_reason)
  );
end;
$$;

revoke all on function public.reopen_proposal(uuid, text) from public;
grant execute on function public.reopen_proposal(uuid, text) to authenticated;

comment on function public.reopen_proposal(uuid, text) is
  'Author-only undo of a proposal→mission conversion. Reverts status to pending and clears has_converted_mission_id. The original mission row is preserved (history is not deleted). Writes a proposal_reopened lifecycle event.';

-- ===========================================================================
-- 6) get_proposal_lifecycle_events(p_proposal_id, p_limit) RPC
--    Public-safe listing of the audit log for a proposal.
-- ===========================================================================

create or replace function public.get_proposal_lifecycle_events(
  p_proposal_id uuid,
  p_limit integer default 20
)
returns table (
  id uuid,
  event_type public.proposal_lifecycle_event_type,
  actor_username text,
  actor_first_name text,
  actor_avatar_url text,
  from_status text,
  to_status text,
  converted_mission_id uuid,
  detail text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with events as (
    select
      e.id,
      e.event_type,
      e.actor_id,
      e.from_status,
      e.to_status,
      e.converted_mission_id,
      e.payload,
      e.created_at
    from public.proposal_lifecycle_events e
    where e.proposal_id = p_proposal_id
    order by e.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  )
  select
    ev.id,
    ev.event_type,
    coalesce(pr.username, 'kusqa') as actor_username,
    coalesce(split_part(coalesce(pr.username, ''), ' ', 1), 'KUSQA') as actor_first_name,
    pr.avatar_url as actor_avatar_url,
    ev.from_status,
    ev.to_status,
    ev.converted_mission_id,
    coalesce(ev.payload->>'reason', null) as detail,
    ev.created_at
  from events ev
  left join public.proposal_lifecycle_events e2 on e2.id = ev.id -- (remove if you don't have this)
  left join public.profiles pr on pr.id = ev.actor_id;
$$;

revoke all on function public.get_proposal_lifecycle_events(uuid, integer) from public;
grant execute on function public.get_proposal_lifecycle_events(uuid, integer) to authenticated;

comment on function public.get_proposal_lifecycle_events(uuid, integer) is
  'Public-safe list of lifecycle events for a proposal. Returns actor info as username/first_name/avatar_url only. Used by the proposal detail page to render the conversion history.';
