-- KUSQA: Sync proposals + missions → initiatives via triggers.
--
-- PROBLEM:
--   The collapse migration (20260617000000) backfilled existing rows from
--   proposals and missions into initiatives, but did NOT keep them in sync.
--   New proposals/missions exist only in their legacy tables. Since
--   initiative_comments.initiative_id and initiative_stewards.initiative_id
--   FK to initiatives(id), any comment or steward action on a new proposal
--   violates the FK → 400/409.
--
-- SOLUTION:
--   1) Catch-up: backfill EVERY proposals/missions row missing from initiatives.
--   2) AFTER INSERT OR UPDATE triggers on proposals + missions → upsert into
--      initiatives with the exact column mapping from 20260617.
--   3) AFTER DELETE triggers on proposals + missions → delete from initiatives
--      (child rows cascade).
--   4) NOTIFY pgrst to reload schema cache.
--
-- IDEMPOTENT: Yes (IF NOT EXISTS, DROP IF EXISTS, ON CONFLICT).
-- NO create table, NO ENUM alteration, NO service-layer changes.

-- ===========================================================================
-- 1) Catch-up: backfill proposals → initiatives
-- ===========================================================================

insert into public.initiatives (
  id, kind,
  title, description, summary, why, location_label,
  category, district, district_id, region,
  latitude, longitude,
  owner_id, organizer_id, team_size,
  images, proposed_date,
  status, ready_at, converted_at, completed_at,
  has_converted_initiative_id,
  legacy_proposal_status,
  created_at, updated_at
)
select
  p.id, 'proposal'::initiative_kind,
  p.title, p.description, p.summary, p.why, p.location_label,
  p.category, p.district, p.district_id, p.region,
  p.latitude::double precision, p.longitude::double precision,
  p.user_id, null::uuid, p.team_size,
  coalesce(p.images, '{}'::text[]), p.proposed_date,
  case
    when p.status = 'pending'  then 'forming'::initiative_status
    when p.status = 'active'   then 'gathering'::initiative_status
    when p.status = 'resolved' then 'completed'::initiative_status
    when p.status = 'rejected' then 'dormant'::initiative_status
    else 'forming'::initiative_status
  end,
  p.ready_at, p.converted_at, p.completed_at,
  p.has_converted_mission_id,
  p.status,
  p.created_at, p.updated_at
from public.proposals p
where not exists (
  select 1 from public.initiatives i where i.id = p.id
);

-- ===========================================================================
-- 2) Catch-up: backfill missions → initiatives
-- ===========================================================================

insert into public.initiatives (
  id, kind,
  title, description, category, district, district_id, region,
  latitude, longitude,
  owner_id, organizer_id,
  start_date, end_date,
  max_participants, xp_reward, current_progress,
  status, completed_at,
  source_initiative_id,
  created_at, updated_at
)
select
  m.id,
  'mission'::initiative_kind,
  m.title,
  m.description,
  m.category,
  m.district,
  m.district_id,
  coalesce(
    (select region from public.proposals where id = m.source_proposal_id),
    (select region from public.districts where id = m.district_id),
    'sierra'
  ),
  m.latitude,
  m.longitude,
  coalesce(
    (select p.user_id from public.proposals p where p.id = m.source_proposal_id),
    m.organizer_id
  ),
  m.organizer_id,
  m.start_date,
  m.end_date,
  m.max_participants,
  m.xp_reward,
  m.current_progress,
  case
    when m.end_date is not null and m.end_date < now()
      then 'completed'::initiative_status
    else 'active'::initiative_status
  end,
  m.end_date,
  m.source_proposal_id,
  m.created_at,
  coalesce(m.updated_at, m.created_at)
from public.missions m
where not exists (
  select 1 from public.initiatives i where i.id = m.id
);

-- ===========================================================================
-- 3) Trigger function: sync proposals → initiatives (INSERT OR UPDATE)
-- ===========================================================================

create or replace function public.sync_proposal_initiative_upsert_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.initiatives (
    id, kind,
    title, description, summary, why, location_label,
    category, district, district_id, region,
    latitude, longitude,
    owner_id, organizer_id, team_size,
    images, proposed_date,
    status, ready_at, converted_at, completed_at,
    has_converted_initiative_id,
    legacy_proposal_status,
    created_at, updated_at
  ) values (
    new.id, 'proposal'::initiative_kind,
    new.title, new.description, new.summary, new.why, new.location_label,
    new.category, new.district, new.district_id, new.region,
    new.latitude::double precision, new.longitude::double precision,
    new.user_id, null::uuid, new.team_size,
    coalesce(new.images, '{}'::text[]), new.proposed_date,
    case
      when new.status = 'pending'  then 'forming'::initiative_status
      when new.status = 'active'   then 'gathering'::initiative_status
      when new.status = 'resolved' then 'completed'::initiative_status
      when new.status = 'rejected' then 'dormant'::initiative_status
      else 'forming'::initiative_status
    end,
    new.ready_at, new.converted_at, new.completed_at,
    new.has_converted_mission_id,
    new.status,
    new.created_at, new.updated_at
  )
  on conflict (id) do update set
    title                  = excluded.title,
    description            = excluded.description,
    summary                = excluded.summary,
    why                    = excluded.why,
    location_label         = excluded.location_label,
    category               = excluded.category,
    district               = excluded.district,
    district_id            = excluded.district_id,
    region                 = excluded.region,
    latitude               = excluded.latitude,
    longitude              = excluded.longitude,
    owner_id               = excluded.owner_id,
    team_size              = excluded.team_size,
    images                 = excluded.images,
    proposed_date          = excluded.proposed_date,
    status                 = excluded.status,
    ready_at               = excluded.ready_at,
    converted_at           = excluded.converted_at,
    completed_at           = excluded.completed_at,
    has_converted_initiative_id = excluded.has_converted_initiative_id,
    legacy_proposal_status = excluded.legacy_proposal_status,
    updated_at             = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists trg_sync_proposal_initiative on public.proposals;
create trigger trg_sync_proposal_initiative
  after insert or update on public.proposals
  for each row
  execute function public.sync_proposal_initiative_upsert_fn();

-- ===========================================================================
-- 4) Trigger function: sync missions → initiatives (INSERT OR UPDATE)
-- ===========================================================================

create or replace function public.sync_mission_initiative_upsert_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.initiatives (
    id, kind,
    title, description, category, district, district_id, region,
    latitude, longitude,
    owner_id, organizer_id,
    start_date, end_date,
    max_participants, xp_reward, current_progress,
    status, completed_at,
    source_initiative_id,
    created_at, updated_at
  ) values (
    new.id, 'mission'::initiative_kind,
    new.title, new.description, new.category, new.district, new.district_id,
    coalesce(
      (select region from public.proposals where id = new.source_proposal_id),
      (select region from public.districts where id = new.district_id),
      'sierra'
    ),
    new.latitude, new.longitude,
    coalesce(
      (select p.user_id from public.proposals p where p.id = new.source_proposal_id),
      new.organizer_id
    ),
    new.organizer_id,
    new.start_date, new.end_date,
    new.max_participants, new.xp_reward, new.current_progress,
    case
      when new.end_date is not null and new.end_date < now()
        then 'completed'::initiative_status
      else 'active'::initiative_status
    end,
    new.end_date,
    new.source_proposal_id,
    new.created_at, new.updated_at
  )
  on conflict (id) do update set
    title               = excluded.title,
    description         = excluded.description,
    category            = excluded.category,
    district            = excluded.district,
    district_id         = excluded.district_id,
    region              = excluded.region,
    latitude            = excluded.latitude,
    longitude           = excluded.longitude,
    owner_id            = excluded.owner_id,
    organizer_id        = excluded.organizer_id,
    start_date          = excluded.start_date,
    end_date            = excluded.end_date,
    max_participants    = excluded.max_participants,
    xp_reward           = excluded.xp_reward,
    current_progress    = excluded.current_progress,
    status              = excluded.status,
    completed_at        = excluded.completed_at,
    source_initiative_id = excluded.source_initiative_id,
    updated_at          = excluded.updated_at;
  return new;
end;
$$;

drop trigger if exists trg_sync_mission_initiative on public.missions;
create trigger trg_sync_mission_initiative
  after insert or update on public.missions
  for each row
  execute function public.sync_mission_initiative_upsert_fn();

-- ===========================================================================
-- 5) Trigger function + triggers: DELETE sync (both tables)
--    Child rows in initiative_comments / initiative_stewards / supports /
--    participants cascade via ON DELETE CASCADE.
-- ===========================================================================

create or replace function public.delete_initiative_sync_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.initiatives where id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_delete_proposal_initiative on public.proposals;
create trigger trg_delete_proposal_initiative
  after delete on public.proposals
  for each row
  execute function public.delete_initiative_sync_fn();

drop trigger if exists trg_delete_mission_initiative on public.missions;
create trigger trg_delete_mission_initiative
  after delete on public.missions
  for each row
  execute function public.delete_initiative_sync_fn();

-- ===========================================================================
-- 6) Notify PostgREST to reload schema cache
--    Resolves 400 on embed profiles!initiative_comments_user_id_fkey(...)
-- ===========================================================================

notify pgrst, 'reload schema';
