# Architecture Decisions

## 2026-06-10: `distanceKm` — Route A (PostGIS available, haversine in mapper)

**Context:** The `distanceKm` field on `Mission` was always hardcoded to `0` or `null`. The roadmap requires real distance.

**Verification:** PostGIS extension is enabled in production via migration `20260611000000_phase13_spatial_intelligence.sql` (line 22). The `find_nearby_missions` RPC already exists in the same migration.

**Decision:** Route A — populate real `distanceKm` using a **client-side haversine** function in `mapRowToMission`, rather than a server-side PostGIS RPC per mission.

**Why client-side, not the RPC:**
- `find_nearby_missions` returns only missions within a radius — unsuitable for populating `distanceKm` for *all* missions.
- The mapper already has `lat`/`lng` per row, so computing `haversineDistance(referenceCoords, missionCoords)` requires zero network I/O.
- The RPC remains available for the "find nearby" map feature (a different use case).

**Implementation:**
- `src/domain/geo.ts` — pure `haversineDistance(a: GeoCoords, b: GeoCoords): number`
- `Mission.distanceKm` changed from `number` to `number | null`
- `missionRepository.findAll`, `.findById`, `.findAllByIds`, `.findByDistrict` accept optional `referenceCoords?: GeoCoords`
- When `referenceCoords` is provided → real haversine distance, rounded to 1 decimal
- When not provided → `null` (no fabricated distance)
- The field is never rendered in any UI surface (confirmed by audit) — the type change is backwards-compatible

**Result:** `distanceKm` is either `null` (no reference point available) or a real km value. No `0` placeholders.
