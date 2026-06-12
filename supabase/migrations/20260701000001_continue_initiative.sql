-- KUSQA Phase 4D.1: Continue dormant initiative — additive continuation event.
--
-- Enables a dormant initiative (proposal or mission) to be continued by
-- a new person, reusing the existing lifecycle enum and steward table.
--
-- What it does (atomically):
--   1) Validates the initiative is dormant
--   2) Transitions status → 'forming' (reopening for new support)
--   3) Adds the acting user as an accepted steward
--   4) Appends one 'initiative.continued' civic event
--   5) Does NOT change owner_id (ownership invariant preserved)
--
-- This is the single "write" expression of the Living Territory —
-- a dormant cause is pick-up-able so effort outlives the first organizer.
--
-- DEPENDS ON: 20260701000000_add_initiative_continued_event_kind.sql

set search_path = public;

-- ─── 1. RPC: continue_initiative ──────────────────────────────────────────

create or replace function public.continue_initiative(
  p_initiative_id uuid,
  p_actor_id uuid
) returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_initiative record;
  v_steward_id uuid;
  v_event_id uuid;
begin
  -- Validate required inputs
  if p_initiative_id is null then
    raise exception 'INVALID_INPUT: p_initiative_id is required' using errcode = 'P0001';
  end if;
  if p_actor_id is null then
    raise exception 'INVALID_INPUT: p_actor_id is required' using errcode = 'P0001';
  end if;

  -- Read the initiative (lock row to prevent race)
  select * into v_initiative
  from public.initiatives
  where id = p_initiative_id
  for update;

  if not found then
    raise exception 'INITIATIVE_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Only dormant initiatives can be continued
  if v_initiative.status <> 'dormant' then
    raise exception 'INVALID_STATE' using errcode = 'P0001';
  end if;

  -- 1. Transition status back to forming
  update public.initiatives
  set status = 'forming',
      updated_at = now()
  where id = p_initiative_id;

  -- 2. Add acting user as accepted steward (bypass owner-only RLS via SECURITY DEFINER)
  insert into public.initiative_stewards (
    initiative_id, user_id, role, invited_by, status, responded_at
  ) values (
    p_initiative_id, p_actor_id, 'steward'::public.initiative_role,
    v_initiative.owner_id, 'accepted', now()
  )
  on conflict (initiative_id, user_id)
  do update set
    role = 'steward'::public.initiative_role,
    status = 'accepted',
    responded_at = now()
  returning id into v_steward_id;

  -- 3. Append one continuity civic event
  v_event_id := public.append_civic_event(
    p_kind        := 'initiative.continued'::public.civic_event_kind,
    p_actor_id    := p_actor_id,
    p_target_type := v_initiative.kind,
    p_target_id   := p_initiative_id,
    p_district_id := v_initiative.district_id,
    p_payload     := jsonb_build_object(
      'previous_status', 'dormant',
      'new_status', 'forming',
      'initiative_title', v_initiative.title,
      'owner_id', v_initiative.owner_id,
      'steward_id', v_steward_id,
      'initiative_kind', v_initiative.kind
    ),
    p_dedupe_key  := 'continue:' || p_initiative_id::text || ':' || p_actor_id::text
  );

  -- Return summary (owner_id_unchanged assertion for client-side check)
  return jsonb_build_object(
    'initiative_id', p_initiative_id,
    'new_status', 'forming',
    'steward_id', v_steward_id,
    'event_id', v_event_id,
    'owner_id', v_initiative.owner_id,
    'owner_id_unchanged', true
  );
end;
$$;

revoke all on function public.continue_initiative(uuid, uuid) from public;
grant execute on function public.continue_initiative(uuid, uuid) to authenticated;

comment on function public.continue_initiative(uuid, uuid) is
  'Continues a dormant initiative: transitions to forming, adds actor as steward, appends initiative.continued civic event. Owner_id unchanged.';
