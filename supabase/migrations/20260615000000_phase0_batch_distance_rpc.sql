-- Phase 0 (follow-up): Migrate distanceKm from client-side haversine to
-- PostGIS batch RPC.
--
-- RPC:
--   1) find_nearby_missions overload (p_lat, p_lng, p_limit) — returns ALL
--      missions with real PostGIS ST_Distance, ordered by proximity,
--      without a radius filter. Used for bulk distance resolution.
--
-- The existing 4-param overload (p_lat, p_lng, p_radius_km, p_limit) is
-- preserved for the "find nearby" map feature.
--
-- Depends on: 20260611000000_phase13_spatial_intelligence.sql (enables
-- PostGIS and creates the first find_nearby_missions overload).

create or replace function public.find_nearby_missions(
  p_lat         double precision,
  p_lng         double precision,
  p_limit       int default 500
) returns table (
  id              uuid,
  distance_km     double precision
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select
    m.id,
    (st_distance(
      st_makepoint(m.longitude, m.latitude)::geography,
      st_makepoint(p_lng, p_lat)::geography
    ) / 1000.0)::double precision as distance_km
  from public.missions m
  where m.latitude is not null
    and m.longitude is not null
  order by distance_km
  limit greatest(p_limit, 1);
$$;

revoke all on function public.find_nearby_missions(double precision, double precision, int) from public;
grant execute on function public.find_nearby_missions(double precision, double precision, int) to authenticated;

comment on function public.find_nearby_missions(double precision, double precision, int) is
  'Returns ALL missions with PostGIS ST_Distance, ordered by proximity (no radius filter). Used to bulk-populate distanceKm in the read model.';
