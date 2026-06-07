-- KUSQA Baseline — committed schema contract.
--
-- This file documents and creates the core tables that all subsequent
-- migrations assume exist. It is intentionally idempotent (CREATE TABLE IF NOT
-- EXISTS / ADD COLUMN IF NOT EXISTS) so it can be re-run safely against an
-- existing Supabase project that already has these tables.
--
-- Goal: a fresh `supabase db push` against an empty project should succeed
-- and produce a working baseline that 0001+ migrations can build on.
--
-- Conventions:
--   - All ids are uuid with gen_random_uuid() default
--   - All timestamps are timestamptz with now() default
--   - RLS is enabled on every table; SELECT policy for public-facing tables
--     is "to authenticated using (true)" (the rest are own-only)
--   - No fake/mocks/placeholders in this file
--
-- Tables created here (in dependency order):
--   1. profiles
--   2. missions
--   3. mission_participants
--   4. user_progress
--   5. proposals
--   6. proposal_supports
--
-- Tables created elsewhere (see subsequent migrations):
--   - proposal_collaborators, proposal_comments (20260606000000)
--   - districts, district_id FK columns (20260606010000/200)
--   - proposal_lifecycle_events (20260606040000)
--   - event_log (20260604000000)
--   - mission_events, mission_evidence, user_notifications, etc.

-- ===========================================================================
-- 1) profiles
-- ===========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null unique,
  full_name text null,
  avatar_url text null,
  experience_points integer not null default 0,
  level integer not null default 1,
  bio text null,
  location text null,
  district text null,
  region text null check (region in ('costa','sierra','selva')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists profiles_district_idx on public.profiles (district) where district is not null;

alter table public.profiles enable row level security;

-- SELECT: users can only read their own row. (Hardened in 20260601000000.)
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- INSERT: a profile row is created when its auth.users row is created
-- (the trigger that does this lives in 20260605030000-style migrations; this
-- baseline just allows the table to be INSERTed by the auth bootstrap path).
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- updated_at trigger
create or replace function public.handle_updated_at_profiles()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_profiles on public.profiles;
create trigger trg_handle_updated_at_profiles
  before update on public.profiles
  for each row execute function public.handle_updated_at_profiles();

comment on table public.profiles is 'KUSQA member profile. RLS-own-only. Public-safe fields surface via SECURITY DEFINER RPCs.';

-- ===========================================================================
-- 2) missions
-- ===========================================================================

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  district text not null,
  category text not null check (category in ('environment','infrastructure','community','education','health')),
  latitude double precision not null,
  longitude double precision not null,
  organizer_id uuid null references public.profiles(id) on delete set null,
  start_date timestamptz null,
  end_date timestamptz null,
  current_progress integer null default 0,
  max_participants integer null,
  xp_reward integer not null default 320 check (xp_reward >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists missions_district_idx on public.missions (district);
create index if not exists missions_category_idx on public.missions (category);
create index if not exists missions_created_at_idx on public.missions (created_at desc);

alter table public.missions enable row level security;

-- SELECT: any authenticated user (public civic surface).
drop policy if exists "missions_select_authenticated" on public.missions;
create policy "missions_select_authenticated"
  on public.missions for select
  to authenticated
  using (true);

-- INSERT/UPDATE/DELETE: organizer-only.
drop policy if exists "missions_insert_organizer" on public.missions;
create policy "missions_insert_organizer"
  on public.missions for insert
  to authenticated
  with check (auth.uid() = organizer_id);

drop policy if exists "missions_update_organizer" on public.missions;
create policy "missions_update_organizer"
  on public.missions for update
  to authenticated
  using (auth.uid() = organizer_id)
  with check (auth.uid() = organizer_id);

drop policy if exists "missions_delete_organizer" on public.missions;
create policy "missions_delete_organizer"
  on public.missions for delete
  to authenticated
  using (auth.uid() = organizer_id);

create or replace function public.handle_updated_at_missions()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_missions on public.missions;
create trigger trg_handle_updated_at_missions
  before update on public.missions
  for each row execute function public.handle_updated_at_missions();

comment on table public.missions is 'Civic missions executed in a district. Public-read, organizer-write.';

-- ===========================================================================
-- 3) mission_participants
-- ===========================================================================

create table if not exists public.mission_participants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mission_id uuid not null references public.missions(id) on delete cascade,
  xp_earned integer null check (xp_earned is null or xp_earned >= 0),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint mission_participants_user_mission_unique unique (user_id, mission_id)
);

create index if not exists mission_participants_user_id_idx on public.mission_participants (user_id);
create index if not exists mission_participants_mission_id_idx on public.mission_participants (mission_id);

alter table public.mission_participants enable row level security;

drop policy if exists "mission_participants_select_all" on public.mission_participants;
create policy "mission_participants_select_all"
  on public.mission_participants for select
  to authenticated
  using (true);

drop policy if exists "mission_participants_insert_own" on public.mission_participants;
create policy "mission_participants_insert_own"
  on public.mission_participants for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "mission_participants_update_own" on public.mission_participants;
create policy "mission_participants_update_own"
  on public.mission_participants for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.mission_participants is 'Authoritative user↔mission participation. One row = participation. xp_earned is granted on completion.';

-- ===========================================================================
-- 4) user_progress
-- ===========================================================================

create table if not exists public.user_progress (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_missions_completed integer not null default 0 check (total_missions_completed >= 0),
  community_points integer not null default 0 check (community_points >= 0),
  last_activity_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own"
  on public.user_progress for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own"
  on public.user_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own"
  on public.user_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.handle_updated_at_user_progress()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_user_progress on public.user_progress;
create trigger trg_handle_updated_at_user_progress
  before update on public.user_progress
  for each row execute function public.handle_updated_at_user_progress();

comment on table public.user_progress is 'Aggregate civic stats per user. Computed from mission_participants + proposal_supports; never source-of-truth for individual actions.';

-- ===========================================================================
-- 5) proposals
-- ===========================================================================

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text null,
  category text not null check (category in ('Medio ambiente','Educación','Arte & cultura','Comunidad','Salud','Tecnología')),
  district text not null,
  region text not null check (region in ('costa','sierra','selva')),
  team_size integer not null check (team_size >= 3 and team_size <= 80),
  images text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','active','resolved','rejected')),
  latitude numeric null,
  longitude numeric null,
  proposed_date timestamptz null,
  summary text null check (summary is null or char_length(summary) <= 280),
  why text null check (why is null or char_length(why) <= 600),
  location_label text null check (location_label is null or char_length(location_label) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_user_id_idx on public.proposals (user_id);
create index if not exists proposals_district_idx on public.proposals (district);
create index if not exists proposals_region_idx on public.proposals (region);
create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_created_at_idx on public.proposals (created_at desc);

alter table public.proposals enable row level security;

drop policy if exists "proposals_select_public" on public.proposals;
create policy "proposals_select_public"
  on public.proposals for select
  to authenticated
  using (true);

drop policy if exists "proposals_insert_own" on public.proposals;
create policy "proposals_insert_own"
  on public.proposals for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "proposals_update_own" on public.proposals;
create policy "proposals_update_own"
  on public.proposals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "proposals_delete_own" on public.proposals;
create policy "proposals_delete_own"
  on public.proposals for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.handle_updated_at_proposals()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_proposals on public.proposals;
create trigger trg_handle_updated_at_proposals
  before update on public.proposals
  for each row execute function public.handle_updated_at_proposals();

comment on table public.proposals is 'Civic proposals. Public-read. Authors manage their own rows. The status enum drives the proposal lifecycle (pending → active → resolved).';

-- ===========================================================================
-- 6) proposal_supports
-- ===========================================================================

create table if not exists public.proposal_supports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint proposal_supports_user_proposal_unique unique (user_id, proposal_id)
);

create index if not exists proposal_supports_user_id_idx on public.proposal_supports (user_id);
create index if not exists proposal_supports_proposal_id_idx on public.proposal_supports (proposal_id);
create index if not exists proposal_supports_proposal_created_idx
  on public.proposal_supports (proposal_id, created_at desc);

alter table public.proposal_supports enable row level security;

drop policy if exists "proposal_supports_select_all" on public.proposal_supports;
create policy "proposal_supports_select_all"
  on public.proposal_supports for select
  to authenticated
  using (true);

drop policy if exists "proposal_supports_insert_own" on public.proposal_supports;
create policy "proposal_supports_insert_own"
  on public.proposal_supports for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "proposal_supports_delete_own" on public.proposal_supports;
create policy "proposal_supports_delete_own"
  on public.proposal_supports for delete
  to authenticated
  using (auth.uid() = user_id);

comment on table public.proposal_supports is 'One row per (user, proposal) support. Idempotent: UNIQUE(user_id, proposal_id). Aggregated via proposal_support_stats view.';
