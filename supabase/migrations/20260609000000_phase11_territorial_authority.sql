-- KUSQA Phase 11 — Territorial Authority and Persistence
--
-- Close the final persistence and authority gaps identified in
-- Phases 10C and 10F.
--
-- What this migration does:
--   1. Adds phantom proposal columns (ready_at, converted_at, completed_at)
--   2. Creates the log_proposal_lifecycle_event RPC (was called but never defined)
--   3. Adds DELETE trigger on proposal_supports → proposal.unsupported civic event
--   4. Adds INSERT trigger on proposal_comments → proposal.comment_added civic event
--   5. Updates convert_proposal_to_mission to set district_id + emit civic event
--   6. Updates reopen_proposal to emit proposal.reopened civic event
--   7. Backfills mission.district_id for any remaining NULL rows
--   8. Backfills proposal.ready_at from existing coalition-threshold crossings
--
-- All operations are additive and idempotent.

set search_path = public;

-- ===========================================================================
-- 1) Add phantom columns to proposals (TypeScript-only columns that were
--    never persisted to the DB)
-- ===========================================================================

alter table public.proposals
  add column if not exists ready_at timestamptz null,
  add column if not exists converted_at timestamptz null,
  add column if not exists completed_at timestamptz null;

create index if not exists proposals_ready_at_idx
  on public.proposals (ready_at)
  where ready_at is not null;

create index if not exists proposals_converted_at_idx
  on public.proposals (converted_at)
  where converted_at is not null;

create index if not exists proposals_completed_at_idx
  on public.proposals (completed_at)
  where completed_at is not null;

comment on column public.proposals.ready_at is
  'Timestamp when the proposal first reached its coalition threshold. Set by log_proposal_lifecycle_event RPC.';
comment on column public.proposals.converted_at is
  'Timestamp when the proposal was converted to a mission. Set by convert_proposal_to_mission RPC.';
comment on column public.proposals.completed_at is
  'Timestamp when the resulting mission was completed (if ever). Set by completion workflow.';

-- ===========================================================================
-- 2) log_proposal_lifecycle_event RPC
--    Authoritative server-side event logger for proposal lifecycle events.
--    Was called from supportProposal() but never defined.
-- ===========================================================================

create or replace function public.log_proposal_lifecycle_event(
  p_proposal_id  uuid,
  p_event_type   public.proposal_lifecycle_event_type,
  p_actor_id     uuid,
  p_from_status  text default null,
  p_to_status    text default null,
  p_payload      jsonb default '{}'::jsonb
) returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_existing proposals;
begin
  -- Must have an actor (auth context or explicit actor)
  if auth.uid() is null and p_actor_id is null then
    raise exception 'UNAUTHENTICATED' using errcode = '42501';
  end if;

  -- Verify the proposal exists
  select * into v_existing
  from public.proposals
  where id = p_proposal_id;

  if v_existing.id is null then
    raise exception 'PROPOSAL_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- If this is a coalition_threshold_reached event, also set ready_at
  -- (only if not already set, to preserve the first crossing)
  if p_event_type = 'coalition_threshold_reached' and v_existing.ready_at is null then
    update public.proposals
    set ready_at = now(),
        updated_at = now()
    where id = p_proposal_id
      and ready_at is null;
  end if;

  -- Insert the lifecycle event
  insert into public.proposal_lifecycle_events (
    proposal_id, event_type, actor_id, from_status, to_status, payload
  ) values (
    p_proposal_id, p_event_type, p_actor_id, p_from_status, p_to_status, coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.log_proposal_lifecycle_event(uuid, public.proposal_lifecycle_event_type, uuid, text, text, jsonb) from public;
grant execute on function public.log_proposal_lifecycle_event(uuid, public.proposal_lifecycle_event_type, uuid, text, text, jsonb) to authenticated;

comment on function public.log_proposal_lifecycle_event(uuid, public.proposal_lifecycle_event_type, uuid, text, text, jsonb) is
  'Server-authoritative proposal lifecycle event logger. Idempotent for coalition_threshold_reached (only sets ready_at once). Called from supportProposal() and future RPCs.';

-- ===========================================================================
-- 3) DELETE trigger on proposal_supports → proposal.unsupported
--    Closes the event coherence gap: when support is removed, emit a
--    civic_event so the district feed and intelligence layer can react.
-- ===========================================================================

create or replace function public.trg_fanout_proposal_unsupported()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_district_id uuid;
  v_dedupe text;
begin
  select district_id into v_proposal_district_id
  from public.proposals
  where id = OLD.proposal_id;

  v_dedupe := 'proposal.unsupported:' || OLD.proposal_id::text || ':' || OLD.user_id::text;

  perform public.append_civic_event(
    p_kind        := 'proposal.unsupported'::public.civic_event_kind,
    p_actor_id    := OLD.user_id,
    p_target_type := 'proposal',
    p_target_id   := OLD.proposal_id,
    p_district_id := v_proposal_district_id,
    p_payload     := jsonb_build_object('unsupport_id', OLD.id),
    p_dedupe_key  := v_dedupe
  );

  return OLD;
end;
$$;

drop trigger if exists trg_fanout_proposal_unsupported on public.proposal_supports;
create trigger trg_fanout_proposal_unsupported
  after delete on public.proposal_supports
  for each row
  execute function public.trg_fanout_proposal_unsupported();

-- ===========================================================================
-- 4) INSERT trigger on proposal_comments → proposal.comment_added
--    Emits a civic_event so that comments appear in the unified feed
--    and territorial intelligence.
-- ===========================================================================

create or replace function public.trg_fanout_proposal_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proposal_district_id uuid;
  v_dedupe text;
begin
  select district_id into v_proposal_district_id
  from public.proposals
  where id = NEW.proposal_id;

  v_dedupe := 'proposal.comment_added:' || NEW.id::text;

  perform public.append_civic_event(
    p_kind        := 'proposal.comment_added'::public.civic_event_kind,
    p_actor_id    := NEW.user_id,
    p_target_type := 'comment',
    p_target_id   := NEW.id,
    p_district_id := v_proposal_district_id,
    p_payload     := jsonb_build_object(
      'proposal_id', NEW.proposal_id,
      'is_reply', NEW.parent_comment_id is not null
    ),
    p_dedupe_key  := v_dedupe
  );

  return NEW;
end;
$$;

drop trigger if exists trg_fanout_proposal_comment on public.proposal_comments;
create trigger trg_fanout_proposal_comment
  after insert on public.proposal_comments
  for each row
  execute function public.trg_fanout_proposal_comment();

-- ===========================================================================
-- 5) Update convert_proposal_to_mission — set district_id + emit civic event
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

  -- Insert the new mission, now including district_id from the proposal.
  insert into public.missions (
    title, description, district, district_id, category, latitude, longitude,
    organizer_id, start_date, end_date, current_progress, max_participants, xp_reward,
    source_proposal_id
  ) values (
    v_proposal.title,
    v_proposal.description,
    v_proposal.district,
    v_proposal.district_id,
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

  -- Update the proposal: resolved + converted_at timestamp + has_converted_mission_id.
  update public.proposals
  set status = 'resolved',
      has_converted_mission_id = v_new_mission_id,
      converted_at = now(),
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

  -- Phase 11: emit civic event for unified feed.
  perform public.append_civic_event(
    p_kind        := 'proposal.converted_to_mission'::public.civic_event_kind,
    p_actor_id    := v_actor_id,
    p_target_type := 'proposal',
    p_target_id   := p_proposal_id,
    p_district_id := v_proposal.district_id,
    p_payload     := jsonb_build_object(
      'mission_id', v_new_mission_id,
      'support_count', v_support_count,
      'threshold', v_threshold
    ),
    p_dedupe_key  := 'proposal.converted_to_mission:' || p_proposal_id::text
  );

  return v_new_mission_id;
end;
$$;

revoke all on function public.convert_proposal_to_mission(uuid, timestamptz, text) from public;
grant execute on function public.convert_proposal_to_mission(uuid, timestamptz, text) to authenticated;

comment on function public.convert_proposal_to_mission(uuid, timestamptz, text) is
  'Atomic proposal→mission conversion. Idempotent. Author-only. Sets district_id, logs lifecycle event, emits civic event.';

-- ===========================================================================
-- 6) Update reopen_proposal — emit proposal.reopened civic event
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

  -- Phase 11: emit civic event for unified feed.
  perform public.append_civic_event(
    p_kind        := 'proposal.reopened'::public.civic_event_kind,
    p_actor_id    := v_actor_id,
    p_target_type := 'proposal',
    p_target_id   := p_proposal_id,
    p_district_id := v_proposal.district_id,
    p_payload     := jsonb_build_object(
      'reason', p_reason,
      'previous_mission_id', v_proposal.has_converted_mission_id
    ),
    p_dedupe_key  := 'proposal.reopened:' || p_proposal_id::text || ':' || v_proposal.has_converted_mission_id::text
  );
end;
$$;

revoke all on function public.reopen_proposal(uuid, text) from public;
grant execute on function public.reopen_proposal(uuid, text) to authenticated;

comment on function public.reopen_proposal(uuid, text) is
  'Author-only undo for post-conversion grace window. Emits lifecycle event + civic event.';

-- ===========================================================================
-- 7) Backfill any remaining mission.district_id values
-- ===========================================================================

update public.missions m
set district_id = d.id
from public.districts d
where m.district_id is null
  and d.slug = public.kusqa_district_slugify(m.district);

-- ===========================================================================
-- 8) Backfill proposal.ready_at for existing rows where the threshold
--    was reached (proposal has at least threshold supports)
-- ===========================================================================

update public.proposals p
set ready_at = (
  select min(ps.created_at)
  from public.proposal_supports ps
  where ps.proposal_id = p.id
)
where p.ready_at is null
  and p.status in ('pending', 'active', 'resolved')
  and (
    select count(*)
    from public.proposal_supports ps
    where ps.proposal_id = p.id
  ) >= greatest(3, ceil(p.team_size * 0.3)::int);
