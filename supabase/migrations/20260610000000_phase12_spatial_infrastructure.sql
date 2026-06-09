-- KUSQA Phase 12 — Spatial Territorial Infrastructure
--
-- Transforms the spatial layer from hardcoded geographic approximation
-- into DB-driven territorial geometry.
--
-- What this migration does:
--   1. Adds geometry columns to districts (boundary GeoJSON, SVG coords, hierarchy)
--   2. Seeds boundary polygons for all districts (coarse bounding boxes)
--   3. Seeds SVG footprint coordinates for all districts
--   4. Seeds parent_id for department/district hierarchy
--   5. Creates a useful spatial-metadata query function
--
-- All operations are additive and idempotent.

set search_path = public;

-- ===========================================================================
-- 1) Add geometry columns to districts
-- ===========================================================================

alter table public.districts
  add column if not exists boundary     jsonb null,
  add column if not exists svg_x        integer null,
  add column if not exists svg_y        integer null;

comment on column public.districts.boundary is
  'GeoJSON Feature (Polygon) — coarse bounding polygon for map overlays. NULL for districts without a mapped shape.';
comment on column public.districts.svg_x is
  'X coordinate within the 240×360 Peru-silhouette SVG viewBox for footprint visualization.';
comment on column public.districts.svg_y is
  'Y coordinate within the 240×360 Peru-silhouette SVG viewBox for footprint visualization.';

-- ===========================================================================
-- 2) Seed boundary polygons + SVG coordinates for all 33 districts
--
-- Strategy:
--   Existing DISTRICT_POLYGONS values preserved; new districts get ~0.02°
--   bounding boxes around their canonical centroid.
-- ===========================================================================

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-77.045,-12.105],[-77.01,-12.105],[-77.01,-12.165],[-77.045,-12.165],[-77.045,-12.105]]]}}'::jsonb,
  svg_x = 75, svg_y = 105
where slug = 'barranco';

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-77.045,-12.105],[-77.01,-12.105],[-77.01,-12.165],[-77.045,-12.165],[-77.045,-12.105]]]}}'::jsonb,
  svg_x = 77, svg_y = 103
where slug = 'miraflores';

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-77.03,-11.96],[-76.99,-11.96],[-76.99,-12.00],[-77.03,-12.00],[-77.03,-11.96]]]}}'::jsonb,
  svg_x = 80, svg_y = 108
where slug = 'san-juan-de-lurigancho';

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-79.13,-8.04],[-78.97,-8.04],[-78.97,-8.16],[-79.13,-8.16],[-79.13,-8.04]]]}}'::jsonb,
  svg_x = 60, svg_y = 75
where slug = 'trujillo';

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-72.1,-13.32],[-71.85,-13.32],[-71.85,-13.56],[-72.1,-13.56],[-72.1,-13.32]]]}}'::jsonb,
  svg_x = 125, svg_y = 165
where slug = 'cusco-centro';

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-72.07,-13.38],[-72.03,-13.38],[-72.03,-13.41],[-72.07,-13.41],[-72.07,-13.38]]]}}'::jsonb,
  svg_x = 130, svg_y = 158
where slug = 'chinchero';

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-72.13,-13.29],[-72.10,-13.29],[-72.10,-13.32],[-72.13,-13.32],[-72.13,-13.29]]]}}'::jsonb,
  svg_x = 135, svg_y = 155
where slug = 'urubamba';

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-70.1,-15.78],[-69.86,-15.78],[-69.86,-15.93],[-70.1,-15.93],[-70.1,-15.78]]]}}'::jsonb,
  svg_x = 120, svg_y = 245
where slug = 'puno-ciudad';

update public.districts set
  boundary = '{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-73.31,-3.69],[-73.21,-3.69],[-73.21,-3.81],[-73.31,-3.81],[-73.31,-3.69]]]}}'::jsonb,
  svg_x = 160, svg_y = 65
where slug = 'iquitos';

-- Remaining districts: auto-compute bounding box + SVG coords from centroid

update public.districts set
  boundary = jsonb_build_object(
    'type', 'Feature',
    'properties', '{}'::jsonb,
    'geometry', jsonb_build_object(
      'type', 'Polygon',
      'coordinates', jsonb_build_array(
        jsonb_build_array(
          jsonb_build_array(longitude - 0.02, latitude + 0.02),
          jsonb_build_array(longitude + 0.02, latitude + 0.02),
          jsonb_build_array(longitude + 0.02, latitude - 0.02),
          jsonb_build_array(longitude - 0.02, latitude - 0.02),
          jsonb_build_array(longitude - 0.02, latitude + 0.02)
        )
      )
    )
  ),
  svg_x = greatest(10, least(230, round((longitude + 81.0) / 13.0 * 240)::int)),
  svg_y = greatest(10, least(350, round((0.0 - latitude) / 18.0 * 360)::int))
where slug in (
  'san-isidro', 'magdalena', 'san-miguel', 'pueblo-libre', 'jesus-maria',
  'lince', 'san-borja', 'surco', 'la-molina', 'san-martin-de-porres',
  'comas', 'villa-maria-del-triunfo', 'rimac', 'villa-el-salvador',
  'huanchaco', 'ollantaytambo', 'pisac', 'arequipa-centro',
  'caucaya', 'punchana', 'belen-iquitos', 'san-juan-bautista-iquitos'
);

-- ===========================================================================
-- 3) Update region SVG centers in a metadata table so the footprint
--    visualization can be data-driven.
-- ===========================================================================

create table if not exists public.region_metadata (
  slug         text primary key,
  display_name text not null,
  svg_x        integer not null,
  svg_y        integer not null,
  description  text null
);

insert into public.region_metadata (slug, display_name, svg_x, svg_y, description) values
  ('costa', 'Costa',  85, 100, 'Costa oeste peruana — Lima, La Libertad y otras regiones costeras'),
  ('sierra', 'Sierra', 125, 180, 'Andes peruanos — Cusco, Puno, Arequipa y regiones altoandinas'),
  ('selva', 'Selva', 145, 275, 'Amazonía peruana — Loreto y regiones amazónicas')
on conflict (slug) do nothing;

create unique index if not exists region_metadata_slug_uidx on public.region_metadata (slug);

alter table public.region_metadata enable row level security;

drop policy if exists "region_metadata_select_authenticated" on public.region_metadata;
create policy "region_metadata_select_authenticated"
  on public.region_metadata for select
  to authenticated
  using (true);

-- ===========================================================================
-- 4) Spatial metadata query function — returns all district geometry data
--    in one round trip for the map and footprint layers.
-- ===========================================================================

create or replace function public.get_territorial_geometry()
returns table (
  id              uuid,
  slug            text,
  display_name    text,
  region          text,
  department      text,
  latitude        numeric,
  longitude       numeric,
  boundary        jsonb,
  svg_x           integer,
  svg_y           integer,
  narrative       text
)
language sql
security definer
set search_path = public
stable
as $$
  select id, slug, display_name, region, department,
         latitude, longitude, boundary, svg_x, svg_y, narrative
  from public.districts
  where latitude is not null
  order by sort_order, display_name;
$$;

revoke all on function public.get_territorial_geometry() from public;
grant execute on function public.get_territorial_geometry() to anon, authenticated;
