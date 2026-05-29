-- Fix mission_participants schema alignment
-- Frontend was inserting status column that doesn't exist in production.
-- 
-- Changes:
--   1. Add completed_at (for completion tracking without status)
--   2. Add xp_earned (for XP tracking)
--   3. Add created_at if missing (for ordering)
--   4. Add UNIQUE constraint on (user_id, mission_id) if missing
--   5. Add RLS policies if missing

-- Add columns (idempotent via IF NOT EXISTS)
alter table if exists public.mission_participants
  add column if not exists completed_at timestamptz,
  add column if not exists xp_earned integer,
  add column if not exists created_at timestamptz not null default now();

-- Add unique constraint on (user_id, mission_id) if not present
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mission_participants_user_mission_unique'
      and conrelid = 'public.mission_participants'::regclass
  ) then
    alter table public.mission_participants
      add constraint mission_participants_user_mission_unique
        unique (user_id, mission_id);
  end if;
end $$;

-- Enable RLS
alter table public.mission_participants enable row level security;

-- RLS policies (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can read own participation'
      and tablename = 'mission_participants'
  ) then
    create policy "Users can read own participation"
      on public.mission_participants for select
      to authenticated using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can join missions'
      and tablename = 'mission_participants'
  ) then
    create policy "Users can join missions"
      on public.mission_participants for insert
      to authenticated with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where policyname = 'Users can update own participation'
      and tablename = 'mission_participants'
  ) then
    create policy "Users can update own participation"
      on public.mission_participants for update
      to authenticated using (auth.uid() = user_id);
  end if;
end $$;
