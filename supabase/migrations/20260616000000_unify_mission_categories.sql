-- ===========================================================================
-- Migration: Unify proposal & mission category vocabularies
--
-- PROBLEM:
--   Proposals used 6 Spanish categories (Medio ambiente, Educación,
--   Arte & cultura, Comunidad, Salud, Tecnología). Missions used 5 English
--   values (environment, infrastructure, community, education, health).
--   The converter folded Arte & cultura→community and Tecnología→infrastructure,
--   losing semantic distinctions.
--
-- CHANGE:
--   0. Drop old defaults and convert the ENUM column to standard text.
--   1. Expand missions.category CHECK to accept the same 6 Spanish values
--      that proposals use — this is now the ONE canonical list.
--   2. Backfill existing mission rows:
--      - For rows linked to a proposal (source_proposal_id), recover the
--        proposal's original category.
--      - For unlinked rows, reverse-map the old English values.
--   3. Update convert_proposal_to_mission to pass through the proposal
--      category directly (no CASE folding).
--
-- IDEMPOTENT: Yes. Reversible: drop CHECK + recreate old constraint.
-- ===========================================================================

-- ── 0) Convert ENUM to TEXT & Fix Defaults ──────────────────────────────

-- Drop the old default constraint first, convert the column to text, 
-- and set a new text-based default.
alter table public.missions
  alter column category drop default,
  alter column category type text using category::text,
  alter column category set default 'Comunidad';


-- ── 1) Backfill existing mission rows ───────────────────────────────────

-- First pass: recover from source proposal (best fidelity).
update public.missions m
set category = p.category
from public.proposals p
where m.source_proposal_id = p.id
  and m.category in ('environment', 'infrastructure', 'community', 'education', 'health');

-- Second pass: unlinked rows — reverse-map old DB values.
-- 'environment' carries no ambiguity; 'community' could be Arte & cultura or
-- Comunidad, but without a source proposal we default to Comunidad.
update public.missions
set category = case category
  when 'environment'    then 'Medio ambiente'
  when 'infrastructure' then 'Tecnología'
  when 'community'      then 'Comunidad'
  when 'education'      then 'Educación'
  when 'health'         then 'Salud'
  else 'Comunidad'
end
where category in ('environment', 'infrastructure', 'community', 'education', 'health');


-- ── 2) Change CHECK constraint & Cleanup ────────────────────────────────

alter table public.missions
  drop constraint if exists missions_category_check;

alter table public.missions
  add constraint missions_category_check
  check (category in (
    'Medio ambiente',
    'Educación',
    'Arte & cultura',
    'Comunidad',
    'Salud',
    'Tecnología'
  ));

-- Drop the old enum type (CASCADE handles any hidden dependencies safely)
drop type if exists public.mission_category cascade;


-- ── 3) Update convert_proposal_to_mission — no category folding ─────────

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

  -- Compute threshold + counts.
  v_threshold := greatest(3, ceil(v_proposal.team_size * 0.3)::int);

  select count(*) into v_support_count
  from public.proposal_supports
  where proposal_id = p_proposal_id;

  select count(*) into v_collaborator_count
  from public.proposal_collaborators
  where proposal_id = p_proposal_id
    and status = 'accepted';

  -- Conversion gate.
  if not (
    (v_proposal.status = 'pending' and v_support_count >= v_threshold)
    or v_proposal.status = 'active'
  ) then
    raise exception 'THRESHOLD_NOT_MET' using errcode = 'P0001';
  end if;

  -- Insert the new mission — use the proposal category DIRECTLY (no folding).
  insert into public.missions (
    title, description, district, district_id, category, latitude, longitude,
    organizer_id, start_date, end_date, current_progress, max_participants, xp_reward,
    source_proposal_id
  ) values (
    v_proposal.title,
    v_proposal.description,
    v_proposal.district,
    v_proposal.district_id,
    v_proposal.category,
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

  -- Update the proposal.
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
  'Atomic proposal→mission conversion. Idempotent. Author-only. Category is passed through directly (no folding).';

-- ── 4) Verify ──────────────────────────────────────────────────────────

-- Sanity: no rows should have old English values after backfill.
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.missions
  where category in ('environment', 'infrastructure', 'community', 'education', 'health');

  if v_count > 0 then
    raise warning 'BACKFILL INCOMPLETE: % missions still have old English categories', v_count;
  end if;
end;
$$;

-- Sanity: all existing rows satisfy the new CHECK.
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.missions
  where category not in (
    'Medio ambiente', 'Educación', 'Arte & cultura',
    'Comunidad', 'Salud', 'Tecnología'
  );

  if v_count > 0 then
    raise exception 'SCHEMA VIOLATION: % missions do not satisfy the canonical categories', v_count;
  end if;
end;
$$;