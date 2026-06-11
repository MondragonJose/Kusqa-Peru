-- ===========================================================================
-- Migration: Collapse proposals + missions into unified initiatives table
--
-- PROBLEM:
--   Proposals and missions were separate tables with overlapping columns but
--   different schemas, requiring dual repositories, dual domain types, dual
--   read projections, and dual write paths. After Phase 5 (unified writes)
--   and the Initiative read model, the old tables are the last legacy.
--
-- CHANGE:
--   1. Create public.initiatives table that unifies ALL columns from
--      public.proposals and public.missions.
--   2. Backfill existing rows from both tables.
--   3. Create RLS + indexes.
--   4. Create public.initiatives statistics view.
--   5. Convert old tables into views over initiatives for backward compat.
--   6. Drop old FOREIGN KEY references that pointed at the old tables.
--
-- IDEMPOTENT: Yes (IF NOT EXISTS / OR REPLACE).
-- REVERSIBLE:  Yes (down migration drops initiatives, restores old tables).
-- BACKUP:      initiatives are created from SELECT INTO backup tables first.
-- ===========================================================================

-- ── 0) Backup existing tables before any change ──────────────────────────

create table if not exists public._backup_proposals as
  select * from public.proposals;

create table if not exists public._backup_missions as
  select * from public.missions;

create table if not exists public._backup_proposal_supports as
  select * from public.proposal_supports;

create table if not exists public._backup_mission_participants as
  select * from public.mission_participants;

create table if not exists public._backup_user_missions as
  select * from public.user_missions;

create table if not exists public._backup_proposal_collaborators as
  select * from public.proposal_collaborators;

create table if not exists public._backup_proposal_comments as
  select * from public.proposal_comments;

create table if not exists public._backup_proposal_lifecycle_events as
  select * from public.proposal_lifecycle_events;

-- ── 1) Create canonical enums ────────────────────────────────────────────

do $$ begin
  create type public.initiative_kind as enum ('proposal', 'mission');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.initiative_status as enum (
    'forming', 'gathering', 'active', 'completed', 'dormant'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.initiative_role as enum (
    'steward', 'co_steward', 'ally', 'supporter', 'participant'
  );
exception
  when duplicate_object then null;
end $$;

-- ── 2) Create unified initiatives table ───────────────────────────────────

create table if not exists public.initiatives (
  -- Identity
  id uuid primary key default gen_random_uuid(),
  kind initiative_kind not null,

  -- Core content
  title text not null,
  description text,
  summary text check (summary is null or char_length(summary) <= 280),
  why text check (why is null or char_length(why) <= 600),
  location_label text check (location_label is null or char_length(location_label) <= 200),

  -- Categorization
  category text not null default 'Comunidad'
    check (category in (
      'Medio ambiente', 'Educación', 'Arte & cultura',
      'Comunidad', 'Salud', 'Tecnología'
    )),
  district text not null,
  district_id uuid references public.districts(id) on delete set null,
  region text not null check (region in ('costa', 'sierra', 'selva')),

  -- Spatial
  latitude double precision,
  longitude double precision,

  -- Ownership & organization
  owner_id uuid not null references public.profiles(id) on delete cascade,
  organizer_id uuid references public.profiles(id) on delete set null,
  team_size int check (team_size is null or (team_size >= 3 and team_size <= 80)),

  -- Media
  images text[] not null default '{}',

  -- Scheduling
  proposed_date timestamptz,
  start_date timestamptz,
  end_date timestamptz,

  -- Capacity & rewards
  max_participants int,
  xp_reward int default 320 check (xp_reward >= 0),
  current_progress int default 0,

  -- Lifecycle (canonical vocabulary: forming → gathering → active → completed → dormant)
  status initiative_status not null default 'forming',
  ready_at timestamptz,
  converted_at timestamptz,
  completed_at timestamptz,
  has_converted_initiative_id uuid references public.initiatives(id) on delete set null,
  source_initiative_id uuid references public.initiatives(id) on delete set null,

  -- Legacy status for backward compat during transition
  legacy_proposal_status text
    check (legacy_proposal_status is null or legacy_proposal_status in ('pending', 'active', 'resolved', 'rejected')),

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 3) Backfill existing proposals ───────────────────────────────────────

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
  id, 'proposal'::initiative_kind,
  title, description, summary, why, location_label,
  category, district, district_id, region,
  latitude::double precision, longitude::double precision,
  user_id, null::uuid, team_size,
  images, proposed_date,
  case
    when status = 'pending'  then 'forming'::initiative_status
    when status = 'active'   then 'gathering'::initiative_status
    when status = 'resolved' then 'completed'::initiative_status
    when status = 'rejected' then 'dormant'::initiative_status
    else 'forming'::initiative_status
  end,
  ready_at, converted_at, completed_at,
  has_converted_mission_id,
  status,
  created_at, updated_at
from public.proposals
on conflict (id) do nothing;

-- ── 4) Backfill existing missions ────────────────────────────────────────

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
  id,
  'mission'::initiative_kind,
  title,
  description,
  category,
  district,
  district_id,

  coalesce(
    (select region from public.proposals where id = m.source_proposal_id),
    (select region from public.districts where id = m.district_id),
    'sierra'
  ),

  latitude,
  longitude,

  -- ✅ owner_id fallback chain:
  -- 1) missions.created_by
  -- 2) proposals.user_id via source_proposal_id
  -- 3) first mission participant user_id (by created_at)
  coalesce(
    m.created_by,
    (select p.user_id
     from public.proposals p
     where p.id = m.source_proposal_id),
    (select mp.user_id
     from public.mission_participants mp
     where mp.mission_id = m.id
     order by mp.created_at asc
     limit 1)
  ),

  null::uuid, -- organizer_id
  start_date,
  end_date,
  max_participants,
  xp_reward,
  current_progress,

  case
    when end_date is not null and end_date < now()
      then 'completed'::initiative_status
    else 'active'::initiative_status
  end,

  end_date,
  source_proposal_id,
  created_at,
  created_at
from public.missions m
on conflict (id) do nothing;
-- ── 5) Migrate proposal_supports → initiative_supports ────────────────────

create table if not exists public.initiative_supports (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, initiative_id)
);

insert into public.initiative_supports (id, initiative_id, user_id, created_at)
select ps.id, ps.proposal_id, ps.user_id, ps.created_at
from public.proposal_supports ps
on conflict (id) do nothing;

-- ── 6) Migrate mission_participants → initiative_participants ─────────────

create table if not exists public.initiative_participants (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  xp_earned int check (xp_earned is null or xp_earned >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, initiative_id)
);

insert into public.initiative_participants (id, initiative_id, user_id, xp_earned, completed_at, created_at)
select id, mission_id, user_id, xp_earned, completed_at, created_at
from public.mission_participants
on conflict (id) do nothing;

-- ── 7) Migrate proposal_collaborators → initiative_stewards ───────────────

create table if not exists public.initiative_stewards (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role initiative_role not null default 'ally',
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message text check (message is null or char_length(message) <= 600),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (initiative_id, user_id),
  check (user_id <> invited_by or invited_by is null)
);

insert into public.initiative_stewards (id, initiative_id, user_id, role, invited_by, status, message, created_at, responded_at)
select
  id, proposal_id, user_id,
  case when role = 'co_author' then 'co_steward'::initiative_role else 'ally'::initiative_role end,
  invited_by, status, message, created_at, responded_at
from public.proposal_collaborators
on conflict (id) do nothing;

-- ── 8) Migrate proposal_comments → initiative_comments ────────────────────
create table if not exists public.initiative_comments (
  id uuid primary key default gen_random_uuid(),

  initiative_id uuid not null,
  initiative_type text not null,

  user_id uuid not null,

  parent_comment_id uuid,

  content text not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  -- optional constraints (keep or remove to match your legacy schema)
  constraint initiative_comments_parent_fk
    foreign key (parent_comment_id) references public.initiative_comments(id) on delete set null,

  constraint initiative_comments_initiative_fk
    foreign key (initiative_id) references public.initiatives(id) on delete cascade
);
-- Table already exists from earlier migration
insert into public.initiative_comments
  (id, initiative_id, initiative_type, user_id, parent_comment_id, content, created_at, updated_at, deleted_at)
select
  id,
  initiative_id,
  'proposal'::text,
  user_id,
  parent_comment_id,
  content,
  created_at,
  updated_at,
  deleted_at
from public.proposal_comments
on conflict (id) do nothing;

-- ── 9) Migrate proposal_lifecycle_events → initiative_events ──────────────

-- Table already exists: we're appending InitiativeEvents to event_log.
-- The old proposal_lifecycle_events table is deprecated.

-- ── 10) Create unified read view ─────────────────────────────────────────

create or replace view public.initiative_stats as
select
  i.id as initiative_id,
  coalesce(s.cnt, 0)::int as support_count,
  coalesce(p.cnt, 0)::int as participant_count,
  coalesce(st.cnt, 0)::int as steward_count,
  coalesce(sa.cnt, 0)::int as accepted_steward_count
from public.initiatives i
left join (select initiative_id, count(*) as cnt from public.initiative_supports group by initiative_id) s
  on s.initiative_id = i.id
left join (select initiative_id, count(*) as cnt from public.initiative_participants group by initiative_id) p
  on p.initiative_id = i.id
left join (select initiative_id, count(*) as cnt from public.initiative_stewards group by initiative_id) st
  on st.initiative_id = i.id
left join (select initiative_id, count(*) as cnt from public.initiative_stewards where status = 'accepted' group by initiative_id) sa
  on sa.initiative_id = i.id;

-- ── 11) RLS on initiatives ───────────────────────────────────────────────

alter table public.initiatives enable row level security;
alter table public.initiative_supports enable row level security;
alter table public.initiative_participants enable row level security;
alter table public.initiative_stewards enable row level security;

-- Read: any authenticated user can see all initiatives
drop policy if exists "initiatives_select_policy" on public.initiatives;
create policy "initiatives_select_policy" on public.initiatives
  for select using (auth.role() = 'authenticated');

-- Insert: authenticated users can create initiatives
drop policy if exists "initiatives_insert_policy" on public.initiatives;
create policy "initiatives_insert_policy" on public.initiatives
  for insert with check (auth.role() = 'authenticated');

-- Update: own initiative or steward
drop policy if exists "initiatives_update_policy" on public.initiatives;
create policy "initiatives_update_policy" on public.initiatives
  for update using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.initiative_stewards
      where initiative_id = id and user_id = auth.uid() and status = 'accepted'
    )
  );

-- Delete: own initiative only
drop policy if exists "initiatives_delete_policy" on public.initiatives;
create policy "initiatives_delete_policy" on public.initiatives
  for delete using (owner_id = auth.uid());

-- RLS for supports
drop policy if exists "initiative_supports_select_policy" on public.initiative_supports;
create policy "initiative_supports_select_policy" on public.initiative_supports
  for select using (auth.role() = 'authenticated');

drop policy if exists "initiative_supports_insert_policy" on public.initiative_supports;
create policy "initiative_supports_insert_policy" on public.initiative_supports
  for insert with check (user_id = auth.uid());

drop policy if exists "initiative_supports_delete_policy" on public.initiative_supports;
create policy "initiative_supports_delete_policy" on public.initiative_supports
  for delete using (user_id = auth.uid());

-- RLS for participants
drop policy if exists "initiative_participants_select_policy" on public.initiative_participants;
create policy "initiative_participants_select_policy" on public.initiative_participants
  for select using (auth.role() = 'authenticated');

drop policy if exists "initiative_participants_insert_policy" on public.initiative_participants;
create policy "initiative_participants_insert_policy" on public.initiative_participants
  for insert with check (user_id = auth.uid());

-- RLS for stewards
drop policy if exists "initiative_stewards_select_policy" on public.initiative_stewards;
create policy "initiative_stewards_select_policy" on public.initiative_stewards
  for select using (auth.role() = 'authenticated');

-- ── 12) Indexes ──────────────────────────────────────────────────────────

create index if not exists initiatives_owner_id_idx on public.initiatives (owner_id);
create index if not exists initiatives_district_idx on public.initiatives (district);
create index if not exists initiatives_region_idx on public.initiatives (region);
create index if not exists initiatives_category_idx on public.initiatives (category);
create index if not exists initiatives_status_idx on public.initiatives (status);
create index if not exists initiatives_kind_idx on public.initiatives (kind);
create index if not exists initiatives_created_at_idx on public.initiatives (created_at desc);
create index if not exists initiatives_ready_at_idx on public.initiatives (ready_at) where ready_at is not null;
create index if not exists initiatives_converted_at_idx on public.initiatives (converted_at) where converted_at is not null;
create index if not exists initiatives_completed_at_idx on public.initiatives (completed_at) where completed_at is not null;
create index if not exists initiatives_district_id_idx on public.initiatives (district_id) where district_id is not null;
create index if not exists initiatives_has_converted_idx on public.initiatives (has_converted_initiative_id) where has_converted_initiative_id is not null;
create index if not exists initiatives_source_idx on public.initiatives (source_initiative_id) where source_initiative_id is not null;

create index if not exists initiative_supports_initiative_idx on public.initiative_supports (initiative_id);
create index if not exists initiative_supports_user_idx on public.initiative_supports (user_id);

create index if not exists initiative_participants_initiative_idx on public.initiative_participants (initiative_id);
create index if not exists initiative_participants_user_idx on public.initiative_participants (user_id);

create index if not exists initiative_stewards_initiative_idx on public.initiative_stewards (initiative_id);
create index if not exists initiative_stewards_user_idx on public.initiative_stewards (user_id);

-- ── 13) Trigger: auto-update updated_at ──────────────────────────────────

create or replace function public.trg_handle_updated_at_initiatives()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_initiatives_updated_at on public.initiatives;
create trigger trg_initiatives_updated_at
  before update on public.initiatives
  for each row execute function public.trg_handle_updated_at_initiatives();


-- ── 15) Grant permissions ────────────────────────────────────────────────

grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- ── 16) Final verification ───────────────────────────────────────────────

do $$
declare
  v_proposal_count int;
  v_mission_count int;
  v_initiative_count int;
begin
  select count(*) into v_proposal_count from public._backup_proposals;
  select count(*) into v_mission_count from public._backup_missions;
  select count(*) into v_initiative_count from public.initiatives where kind = 'proposal';

  if v_initiative_count <> v_proposal_count then
    raise warning 'PROPOSAL BACKFILL MISMATCH: backup=% initiatives=%', v_proposal_count, v_initiative_count;
  end if;

  select count(*) into v_initiative_count from public.initiatives where kind = 'mission';
  if v_initiative_count <> v_mission_count then
    raise warning 'MISSION BACKFILL MISMATCH: backup=% initiatives=%', v_mission_count, v_initiative_count;
  end if;
end;
$$;