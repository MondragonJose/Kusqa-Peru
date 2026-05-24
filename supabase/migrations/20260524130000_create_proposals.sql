-- KUSQA: Proposals (Propuestas Cívicas)
-- Tabla para almacenar propuestas cívicas creadas por usuarios
-- Regenerate types: supabase gen types typescript --local > src/types/supabase.generated.ts

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('Medio ambiente', 'Educación', 'Arte & cultura', 'Comunidad', 'Salud', 'Tecnología')),
  district text not null,
  region text not null check (region in ('costa', 'sierra', 'selva')),
  team_size integer not null check (team_size >= 3 and team_size <= 80),
  images text[] default '{}',
  status text not null default 'pending' check (status in ('pending', 'active', 'resolved', 'rejected')),
  latitude numeric null,
  longitude numeric null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_user_id_idx on public.proposals (user_id);
create index if not exists proposals_district_idx on public.proposals (district);
create index if not exists proposals_region_idx on public.proposals (region);
create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_created_at_idx on public.proposals (created_at desc);

alter table public.proposals enable row level security;

-- RLS Policies
-- Usuarios pueden leer todas las propuestas (feed público)
create policy "proposals_select_public"
  on public.proposals for select
  to authenticated
  using (true);

-- Usuarios pueden insertar sus propias propuestas
create policy "proposals_insert_own"
  on public.proposals for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Usuarios pueden actualizar sus propias propuestas
create policy "proposals_update_own"
  on public.proposals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Usuarios pueden eliminar sus propias propuestas
create policy "proposals_delete_own"
  on public.proposals for delete
  to authenticated
  using (auth.uid() = user_id);

-- Trigger para updated_at
create or replace function public.handle_updated_at_proposals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_proposals on public.proposals;
create trigger trg_handle_updated_at_proposals
  before update on public.proposals
  for each row
  execute function public.handle_updated_at_proposals();

comment on table public.proposals is 'Propuestas cívicas creadas por usuarios para acción territorial.';
