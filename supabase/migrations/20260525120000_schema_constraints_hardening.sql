-- KUSQA Phase A: database constraint hardening
-- Risk: run cleanup section first on production copies; verify counts before constraints.

-- ---------------------------------------------------------------------------
-- 1) missions.xp_reward — backend-authoritative economy source
-- ---------------------------------------------------------------------------
alter table public.missions
  add column if not exists xp_reward integer;

update public.missions
set xp_reward = 320
where xp_reward is null;

alter table public.missions
  alter column xp_reward set default 320;

alter table public.missions
  alter column xp_reward set not null;

alter table public.missions
  drop constraint if exists missions_xp_reward_non_negative;

alter table public.missions
  add constraint missions_xp_reward_non_negative
  check (xp_reward >= 0);

comment on column public.missions.xp_reward is
  'Authoritative XP granted on mission completion. Client must never decide economy.';

-- ---------------------------------------------------------------------------
-- 2) user_missions — data cleanup then state invariants
-- ---------------------------------------------------------------------------
update public.user_missions
set xp_earned = 0
where xp_earned is not null and xp_earned < 0;

update public.user_missions
set completed_at = coalesce(completed_at, created_at, now())
where status = 'completed' and completed_at is null;

update public.user_missions um
set xp_earned = coalesce(um.xp_earned, m.xp_reward, 320)
from public.missions m
where um.mission_id = m.id
  and um.status = 'completed'
  and um.xp_earned is null;

update public.user_missions
set completed_at = null, xp_earned = null
where status = 'in_progress'
  and (completed_at is not null or xp_earned is not null);

alter table public.user_missions
  drop constraint if exists user_missions_status_valid;

alter table public.user_missions
  add constraint user_missions_status_valid
  check (status in ('in_progress', 'completed'));

alter table public.user_missions
  drop constraint if exists user_missions_xp_non_negative;

alter table public.user_missions
  add constraint user_missions_xp_non_negative
  check (xp_earned is null or xp_earned >= 0);

alter table public.user_missions
  drop constraint if exists user_missions_completed_requires_fields;

alter table public.user_missions
  add constraint user_missions_completed_requires_fields
  check (
    status <> 'completed'
    or (completed_at is not null and xp_earned is not null)
  );

alter table public.user_missions
  drop constraint if exists user_missions_in_progress_requires_pending_fields;

alter table public.user_missions
  add constraint user_missions_in_progress_requires_pending_fields
  check (
    status <> 'in_progress'
    or (completed_at is null and xp_earned is null)
  );

-- One participation row per user/mission (already unique; ensure index exists)
create unique index if not exists user_missions_user_mission_uidx
  on public.user_missions (user_id, mission_id);

-- Partial indexes for hot paths
create index if not exists user_missions_user_in_progress_idx
  on public.user_missions (user_id)
  where status = 'in_progress';

create index if not exists user_missions_user_completed_idx
  on public.user_missions (user_id, completed_at desc)
  where status = 'completed';

-- ---------------------------------------------------------------------------
-- 3) user_progress — uniqueness + non-negative counters
-- ---------------------------------------------------------------------------
update public.user_progress
set community_points = 0
where community_points < 0;

update public.user_progress
set total_missions_completed = 0
where total_missions_completed < 0;

create unique index if not exists user_progress_user_id_uidx
  on public.user_progress (user_id);

alter table public.user_progress
  drop constraint if exists user_progress_community_points_non_negative;

alter table public.user_progress
  add constraint user_progress_community_points_non_negative
  check (community_points >= 0);

alter table public.user_progress
  drop constraint if exists user_progress_total_missions_non_negative;

alter table public.user_progress
  add constraint user_progress_total_missions_non_negative
  check (total_missions_completed >= 0);

-- ---------------------------------------------------------------------------
-- 4) profiles — non-negative XP
-- ---------------------------------------------------------------------------
update public.profiles
set experience_points = 0
where experience_points is not null and experience_points < 0;

alter table public.profiles
  drop constraint if exists profiles_experience_points_non_negative;

alter table public.profiles
  add constraint profiles_experience_points_non_negative
  check (experience_points is null or experience_points >= 0);

-- ---------------------------------------------------------------------------
-- 5) mission_events — lightweight append-only audit trail
-- ---------------------------------------------------------------------------
create table if not exists public.mission_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid references public.missions (id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint mission_events_type_valid check (
    event_type in (
      'join',
      'join_idempotent',
      'complete',
      'complete_idempotent',
      'xp_granted',
      'rollback_critical'
    )
  )
);

create index if not exists mission_events_actor_created_idx
  on public.mission_events (actor_id, created_at desc);

create index if not exists mission_events_mission_created_idx
  on public.mission_events (mission_id, created_at desc)
  where mission_id is not null;

alter table public.mission_events enable row level security;

comment on table public.mission_events is
  'Append-only civic mission domain events for traceability and future analytics.';
