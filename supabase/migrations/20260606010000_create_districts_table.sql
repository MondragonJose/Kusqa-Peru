-- KUSQA: districts table (Phase 3A).
--
-- Canonical district list. Backed by PERU_LOCAL_PLACES (the autocomplete
-- source) + the mission seed's 14 districts + 4 derived districts
-- (Ollantaytambo, Pisac, Valle Sagrado) referenced in TERRITORY_HIERARCHY.
--
-- Slug rules:
--   - lowercase
--   - NFD-normalize, strip accents
--   - replace whitespace with `-`
--   - collapse multiple separators
--
-- The `district` text column on `proposals`/`missions`/`profiles` remains
-- unchanged for backward compatibility; new code uses `district_id`.
-- Migration 2 (20260606020000) adds the FK columns + backfill.
--
-- RLS:
--   - SELECT: any authenticated user (the district is a public civic surface)
--   - INSERT/UPDATE/DELETE: service_role only (managed by migrations)
--
-- Region is the CHECK enum (costa|sierra|selva) used everywhere; no separate
-- regions table yet (Phase 4+ concern).

create table if not exists public.districts (
  id           uuid        primary key default gen_random_uuid(),
  slug         text        not null,
  display_name text        not null,
  region       text        not null check (region in ('costa','sierra','selva')),
  department   text        null,
  latitude     numeric     null,
  longitude    numeric     null,
  -- Editorial narrative: a 1-paragraph civic identity. NULL is OK; the
  -- district page renders an empty state if absent.
  narrative    text        null check (narrative is null or char_length(narrative) <= 600),
  -- The display order within a region. NULL = append. Used for "Districts
  -- alphabetically within region" without imposing a fake rank.
  sort_order   integer     null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Slug is the public identifier (URL-safe). Must be unique.
create unique index if not exists districts_slug_uidx on public.districts (slug);
create index if not exists districts_region_idx on public.districts (region);
create index if not exists districts_department_idx on public.districts (department) where department is not null;

alter table public.districts enable row level security;

-- SELECT: any authenticated user can read the district catalog.
drop policy if exists "districts_select_authenticated" on public.districts;
create policy "districts_select_authenticated"
  on public.districts for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for `authenticated` — districts are
-- managed via migrations (service_role bypasses RLS).

create or replace function public.handle_updated_at_districts()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_districts on public.districts;
create trigger trg_handle_updated_at_districts
  before update on public.districts
  for each row execute function public.handle_updated_at_districts();

comment on table public.districts is
  'Canonical Peruvian district list. Public-read; the slug is the URL identifier used by /app/distrito/$slug. RLS: any authenticated user can read.';

-- ===========================================================================
-- Seed: 33 entries from PERU_LOCAL_PLACES + 4 derived from TERRITORY_HIERARCHY.
-- Idempotent on slug.
-- ===========================================================================

insert into public.districts (slug, display_name, region, department, latitude, longitude, narrative, sort_order)
select * from (values
  -- Costa — Lima Metropolitana
  ('miraflores',                 'Miraflores',                 'costa', 'Lima',  -12.122, -77.029, 'Miraflores es un distrito costero conocido por sus malecones y parques urbanos. Sus veredas y plazas son punto de encuentro de la comunidad local.', 1),
  ('barranco',                   'Barranco',                   'costa', 'Lima',  -12.148, -77.021, 'Barranco es un distrito pequeño y caminable, con tradición artística y un malecón que mira al Pacífico.', 2),
  ('san-isidro',                 'San Isidro',                 'costa', 'Lima',  -12.097, -77.034, null, 3),
  ('magdalena',                  'Magdalena',                  'costa', 'Lima',  -12.08,  -77.05,  null, 4),
  ('san-miguel',                 'San Miguel',                 'costa', 'Lima',  -12.077, -77.085, null, 5),
  ('pueblo-libre',               'Pueblo Libre',               'costa', 'Lima',  -12.075, -77.067, null, 6),
  ('jesus-maria',                'Jesús María',                'costa', 'Lima',  -12.072, -77.044, null, 7),
  ('lince',                      'Lince',                      'costa', 'Lima',  -12.083, -77.033, null, 8),
  ('san-borja',                  'San Borja',                  'costa', 'Lima',  -12.10,  -76.98,  null, 9),
  ('surco',                      'Santiago de Surco',          'costa', 'Lima',  -12.148, -76.992, null, 10),
  ('la-molina',                  'La Molina',                  'costa', 'Lima',  -12.075, -76.95,  null, 11),
  ('san-juan-de-lurigancho',     'San Juan de Lurigancho',     'costa', 'Lima',  -11.98,  -77.01,  'San Juan de Lurigancho es uno de los distritos más poblados del país. Su territorio es principalmente residencial de laderas.', 12),
  ('san-martin-de-porres',       'San Martín de Porres',       'costa', 'Lima',  -11.95,  -77.07,  null, 13),
  ('comas',                      'Comas',                      'costa', 'Lima',  -11.95,  -77.05,  null, 14),
  ('villa-maria-del-triunfo',    'Villa María del Triunfo',    'costa', 'Lima',  -12.15,  -76.95,  null, 15),
  ('rimac',                      'Rímac',                      'costa', 'Lima',  -12.03,  -77.00,  null, 16),
  ('villa-el-salvador',          'Villa El Salvador',          'costa', 'Lima',  -12.20,  -76.95,  null, 17),
  -- Costa — La Libertad
  ('trujillo',                   'Trujillo',                   'costa', 'La Libertad', -8.115, -79.029, 'Trujillo conserva un centro histórico de arquitectura colonial. Es capital de La Libertad y un nodo cívico para la región norte.', 18),
  ('huanchaco',                  'Huanchaco',                  'costa', 'La Libertad', -8.08,  -79.12,  null, 19),
  -- Sierra — Cusco
  ('cusco-centro',               'Cusco Centro',               'sierra', 'Cusco', -13.522, -71.967, 'Cusco Centro es el núcleo histórico de la región andina. Sus calles empedradas son parte del patrimonio cultural del país.', 1),
  ('chinchero',                  'Chinchero',                  'sierra', 'Cusco', -13.391, -72.049, null, 2),
  ('urubamba',                   'Urubamba',                   'sierra', 'Cusco', -13.303, -72.116, null, 3),
  ('ollantaytambo',              'Ollantaytambo',              'sierra', 'Cusco', -13.258, -72.263, null, 4),
  ('pisac',                      'Pisac',                      'sierra', 'Cusco', -13.420, -71.850, null, 5),
  -- Sierra — Puno
  ('puno-ciudad',                'Puno Ciudad',                'sierra', 'Puno',  -15.84,  -70.02,  'Puno Ciudad se asoma al lago Titicaca. Es el centro cívico de una región con fuerte identidad cultural.', 6),
  -- Sierra — Arequipa
  ('arequipa-centro',            'Arequipa Centro',            'sierra', 'Arequipa', -16.398, -71.536, null, 7),
  ('caucaya',                    'Caucaya',                    'sierra', 'Arequipa', -16.10,  -71.45,  null, 8),
  -- Selva — Loreto
  ('iquitos',                    'Iquitos',                    'selva', 'Loreto', -3.74,  -73.25,  'Iquitos es la ciudad más grande de la Amazonía peruana. Su territorio se organiza alrededor del río Amazonas.', 1),
  ('punchana',                   'Punchana',                   'selva', 'Loreto', -3.73,  -73.27,  null, 2),
  ('belen-iquitos',              'Belén',                      'selva', 'Loreto', -3.76,  -73.23,  null, 3),
  ('san-juan-bautista-iquitos',  'San Juan Bautista',          'selva', 'Loreto', -3.77,  -73.30,  null, 4)
) as v(slug, display_name, region, department, latitude, longitude, narrative, sort_order)
on conflict (slug) do nothing;
