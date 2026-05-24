-- KUSQA: user ↔ mission participation (run against Supabase SQL editor or CLI)
-- Regenerate types: supabase gen types typescript --local > src/types/supabase.generated.ts

create table if not exists public.user_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  status text not null check (status in ('completed', 'in_progress')),
  completed_at timestamptz null,
  xp_earned integer null,
  created_at timestamptz not null default now(),
  constraint user_missions_user_mission_unique unique (user_id, mission_id)
);

create index if not exists user_missions_user_id_idx on public.user_missions (user_id);
create index if not exists user_missions_mission_id_idx on public.user_missions (mission_id);
create index if not exists user_missions_status_idx on public.user_missions (user_id, status);

alter table public.user_missions enable row level security;

-- Example policies (adjust to your auth model):
-- create policy "user_missions_select_own" on public.user_missions for select using (auth.uid() = user_id);
-- create policy "user_missions_insert_own" on public.user_missions for insert with check (auth.uid() = user_id);
-- create policy "user_missions_update_own" on public.user_missions for update using (auth.uid() = user_id);
