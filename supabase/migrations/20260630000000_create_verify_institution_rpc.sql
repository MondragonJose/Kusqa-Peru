-- KUSQA Phase 3: verify_institution SECURITY DEFINER RPC (Audit §4.3 / 5.5 / 6.1).
--
-- PROBLEM:
--   Institution verification (verification_state → 'verified') has no
--   narrow server-side path. The column exists but is only mutable via
--   direct UPDATE (service_role only). We need a logged, auditable RPC
--   that mirrors append_civic_event's server-only trust model.
--
-- CHANGE:
--   1. Add 'institution.endorsed' to civic_event_kind enum (additive).
--   2. Add 'institution' to civic_events.target_type check constraint.
--   3. CREATE verify_institution(p_institution_id) SECURITY DEFINER that
--      sets verification_state = 'verified' and appends a civic_events row.
--   4. REVOKE EXECUTE from public and authenticated (service_role only).
--
-- TRUST MODEL:
--   Exactly matches append_civic_event: SECURITY DEFINER, no grant to
--   anon/authenticated, only the service role key can invoke it.
--   No approval queue, no document storage, no permission matrix.
--
-- IDEMPOTENT: Yes (IF NOT EXISTS / OR REPLACE).
-- REVERSIBLE:  Drop verify_institution, REVOKE, leave enum value dormant.
-- NO frozen files are altered.
-- ===========================================================================
set search_path = public;
-- ===========================================================================
-- 1) Add 'institution.endorsed' to civic_event_kind enum
-- ===========================================================================
-- Additive only — enum value REMOVAL is unsafe; leave dormant on rollback.
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'civic_event_kind' and e.enumlabel = 'institution.endorsed'
  ) then
    alter type public.civic_event_kind add value 'institution.endorsed';
  end if;
end $$;
-- ===========================================================================
-- 2) Add 'institution' to civic_events.target_type check constraint
-- ===========================================================================
alter table public.civic_events
  drop constraint if exists civic_events_target_type_check;

alter table public.civic_events
  add constraint civic_events_target_type_check
  check (target_type in (
    'mission', 'proposal', 'comment', 'district', 'profile', 'evidence', 'institution'
  ));
-- ===========================================================================
-- 3) verify_institution — service-only SECURITY DEFINER RPC
-- ===========================================================================
create or replace function public.verify_institution(
  p_institution_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
begin
  -- Must be called by an authenticated actor (service_role or admin).
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED: verify_institution requires an authenticated context';
  end if;

  -- Confirm institution exists; capture slug for the event payload.
  select slug into v_slug
  from public.institutions
  where id = p_institution_id;

  if not found then
    raise exception 'NOT_FOUND: institution % does not exist', p_institution_id;
  end if;

  -- Set verification_state. Idempotent: if already 'verified', no-op UPDATE.
  update public.institutions
  set verification_state = 'verified'
  where id = p_institution_id;

  -- Record the event via the canonical event log.
  perform public.append_civic_event(
    p_kind        := 'institution.endorsed'::public.civic_event_kind,
    p_actor_id    := auth.uid(),
    p_target_type := 'institution',
    p_target_id   := p_institution_id,
    p_payload     := jsonb_build_object('slug', v_slug)
  );
end;
$$;
-- ===========================================================================
-- 4) Grants — service_role only
-- ===========================================================================
revoke all on function public.verify_institution(uuid) from public, authenticated;
-- ===========================================================================
-- 5) Documentation
-- ===========================================================================
comment on function public.verify_institution is
  'Service-only RPC to set an institution verification_state to verified and record a civic_event. '
  'REVOKEd from anon and authenticated — only callable via service_role key.';
