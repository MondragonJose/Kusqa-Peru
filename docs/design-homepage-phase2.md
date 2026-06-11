# Homepage Phase 2 — Initiative Read Model & Territorial Intelligence

**Status:** Design · No implementation  
**Date:** 2026-06-10

---

## 1. Current State (Phase 1 baseline)

### Landing page (`/` — `routes/index.tsx`)

| Surface                         | Data source                          | Lifecycle aware? | Initiative aware? | Problem                                            |
| ------------------------------- | ------------------------------------ | ---------------- | ----------------- | -------------------------------------------------- |
| Hero badge                      | `missions.length`                    | No               | No                | Only counts missions, not proposals                |
| Mini stats row                  | `deriveStatsFromMissions()`          | No               | No                | Missing proposals, supporters, forming initiatives |
| Peru SVG region labels          | `missionsByRegion` (Mission only)    | No               | No                | "X misiones" — proposals invisible                 |
| Observatory                     | `deriveStatsFromMissions()`          | No               | No                | Hidden when missions=0 even if proposals exist     |
| Floating expedition cards       | Hardcoded (3 items)                  | No               | No                | Never reflects real data                           |
| "Elige tu paisaje" region cards | `missionsByRegion` (Mission only)    | No               | No                | "X misiones" — proposals invisible                 |
| Featured missions grid          | `useMissions()` → `featuredMissions` | No               | No                | Missing proposals entirely                         |

### Dashboard (`/app` — `routes/app.index.tsx`)

| Surface        | Data source                    | Lifecycle aware? | Initiative aware?         | Problem                                                                  |
| -------------- | ------------------------------ | ---------------- | ------------------------- | ------------------------------------------------------------------------ |
| Hero           | `feedItems.length`             | No               | Yes (uses `useCivicFeed`) | None (already on Initiative)                                             |
| Territories    | `allEntities` (Initiative)     | No               | Partial                   | Uses `buildTerritory()` which works with any entity with region/category |
| Ambient signal | `civicEntitiesToAmbientEvents` | No               | Partial                   | Already uses CivicEntity (works with Initiative via adapter)             |
| Feed items     | `selectFeedItems(allEntities)` | No               | Yes                       | Already unified                                                          |
| Feed drawer    | `selectedEntity` (Initiative)  | No               | Yes                       | Already unified                                                          |

---

## 2. Target State (Phase 2)

All homepage and dashboard surfaces consume `Initiative[]` as single data source.
Proposals are no longer invisible. Lifecycle stages are visible. Vitality signals are territorial, not per-initiative.

### New data flow

```
Initiative Resolver
  │
  ├── initiative[] ──────► Homepage stats (forming/active/completed)
  │                         Homepage featured initiatives
  │                         Dashboard feed
  │
  ├── buildTerritorialSummaryFromEntities() ──► Observatory stats
  │                                              Region activity cards
  │
  ├── deriveDistrictVitality(summary) ─────────► Vitality banner
  │
  └── deriveAmbientSignal(events) ─────────────► Ambient pulse
                                                  (unchanged from Phase 1)
```

---

## 3. UX Flow

### 3.1 Landing page sections (top-to-bottom)

```
┌───────────────────────────────────────────────────────────┐
│ HERO                                                       │
│   Badge: "Movimiento vivo · N iniciativas activas"        │
│   (N = active + ending count, not just missions)           │
│   "Crea proyectos cívicos en tu distrito."                │
│   [Crear proyecto] [Explorar mapa]                        │
│   Mini stats: supporters, active districts, initiatives   │
│   Peru SVG with lifecycle counts per region               │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ SNAPSHOT (new — replaces hardcoded floating cards)        │
│   3 real Initiative cards, diverse by region + lifecycle   │
│   Shows: emoji, title, district, lifecycle badge           │
│   Each card: "Apoyar" (forming) / "Unirme" (active/ending) │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ OBSERVATORY (upgraded)                                     │
│   4 animated stats from Initiative model:                  │
│   - forming initiatives + proposals                       │
│   - active initiatives (active + ending)                  │
│   - districts with any activity                           │
│   - total supporters + participants                       │
│   Always visible (no hidden-on-zero) — show "0" honestly  │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ TERRITORIO (upgraded)                                      │
│   "Elige tu paisaje" — region cards show:                 │
│   "X iniciativas" (missions + proposals, not just misiones)│
│   Lifecycle breakdown: forming / active / completed       │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ VITALITY BANNER (new)                                      │
│   "Territorios en movimiento"                             │
│   Horizontally scrollable district chips with:            │
│   - District name + emoji                                 │
│   - Activity class dot (empty/early/active/established)   │
│   - Movement direction arrow (growing/stable/quiet)       │
│   - Active initiative count                               │
│   Click → /app/distrito/$slug                             │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ EXPEDICIONES (upgraded)                                    │
│   6 featured initiatives (missions + proposals)            │
│   Lifecycle badges on each card                           │
│   Fallback: "Sé quien inicia algo aquí" (unchanged)       │
└───────────────────────────────────────────────────────────┘
```

### 3.2 Dashboard sections (top-to-bottom, unchanged layout but upgraded internals)

```
┌───────────────────────────────────────────────────────────┐
│ HERO (unchanged — already Initiative-aware)               │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ SNAPSHOT (new compact stats row)                          │
│   "En cifras" — 3 compact stats:                         │
│   - 🌱 Formándose: N (forming initiatives)               │
│   - ⚡ Activas: N (active + ending)                       │
│   - ✅ Completadas: N (completed)                         │
│   Updates the "Tu territorio está en movimiento" feeling  │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ VITALITY BANNER (new compact bar)                         │
│   "Distritos con más movimiento"                          │
│   Scannable row of 3-5 districts with:                   │
│   - Name                                                  │
│   - Active count + direction arrow                        │
│   Click → /app/distrito/$slug                             │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ REGION CARDS (upgraded — now show lifecycle breakdown)    │
│   Each card shows: forming / active / completed counts    │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│ FEED (unchanged — already Initiative-aware)               │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Architecture de Datos

### 4.1 New pure domain functions

```typescript
// src/domain/initiativeStats.ts (NEW)

import type { Initiative, InitiativeLifecycle } from "./initiative";

export type InitiativeStats = {
  total: number;
  forming: number;
  active: number; // active + ending (live)
  ending: number;
  completed: number;
  archived: number;
  totalParticipants: number;
  totalSupporters: number;
  activeDistricts: number;
};

/**
 * Derive aggregate stats from an Initiative array.
 * Pure function. No I/O.
 */
export function deriveInitiativeStats(initiatives: Initiative[]): InitiativeStats {
  let forming = 0,
    active = 0,
    ending = 0,
    completed = 0,
    archived = 0;
  let totalParticipants = 0,
    totalSupporters = 0;
  const districts = new Set<string>();

  for (const i of initiatives) {
    if (i.lifecycle === "forming") forming++;
    else if (i.lifecycle === "active") active++;
    else if (i.lifecycle === "ending") ending++;
    else if (i.lifecycle === "completed") completed++;
    else if (i.lifecycle === "archived") archived++;

    if (i.participantsCount) totalParticipants += i.participantsCount;
    if (i.supportersCount) totalSupporters += i.supportersCount;
    if (i.location?.district) districts.add(i.location.district);
  }

  return {
    total: initiatives.length,
    forming,
    active,
    ending,
    completed,
    archived,
    totalParticipants,
    totalSupporters,
    activeDistricts: districts.size,
  };
}
```

```typescript
// src/domain/regionAggregations.ts (NEW — replaces inline region counting)

import type { Initiative } from "./initiative";
import type { Region } from "./regions";

export type RegionAggregation = {
  region: Region;
  total: number;
  forming: number;
  active: number;
  completed: number;
};

/**
 * Aggregate initiative counts by region, with lifecycle breakdown.
 */
export function aggregateByRegion(initiatives: Initiative[]): RegionAggregation[] {
  const map = new Map<Region, RegionAggregation>();

  for (const i of initiatives) {
    if (!map.has(i.region)) {
      map.set(i.region, { region: i.region, total: 0, forming: 0, active: 0, completed: 0 });
    }
    const r = map.get(i.region)!;
    r.total++;
    if (i.lifecycle === "forming") r.forming++;
    else if (i.lifecycle === "active" || i.lifecycle === "ending") r.active++;
    else if (i.lifecycle === "completed") r.completed++;
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}
```

```typescript
// src/domain/districtVitalitySummary.ts (NEW — lightweight for home page)

import type {
  TerritorialImpactSummary,
  DistrictActivityClass,
  MovementDirection,
} from "./territoryAggregations";

export type DistrictVitalitySnapshot = {
  slug: string;
  name: string;
  activityClass: DistrictActivityClass;
  direction: MovementDirection;
  activeCount: number;
  emoji: string;
};

/**
 * Select top districts by vitality for the homepage banner.
 * Returns max `limit` results, ordered by active count descending.
 */
export function selectTopDistricts(
  districts: Array<{
    slug: string;
    name: string;
    emoji: string;
    summary: TerritorialImpactSummary;
  }>,
  limit = 5,
): DistrictVitalitySnapshot[] {
  return districts
    .map((d) => ({
      slug: d.slug,
      name: d.name,
      activityClass: classifyDistrictActivity(d.summary),
      direction: deriveMovementDirection(d.summary),
      activeCount: d.summary.missionCount + d.summary.proposalCount,
      emoji: d.emoji,
    }))
    .filter((d) => d.activeCount > 0)
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, limit);
}
```

### 4.2 New query hook (for landing page)

The landing page currently uses `useMissions()` only. Phase 2 adds a parallel hook:

```typescript
// src/features/initiatives/hooks/useLandingInitiatives.ts (NEW)

import { useQuery } from "@tanstack/react-query";
import { initiativeResolver } from "@/services/initiativeResolver";
import { initiativeKeys } from "@/lib/queryKeys";

/**
 * Hook for the public landing page.
 * Fetches all initiatives without auth requirement.
 * Always enabled (no feature flag gate for landing).
 */
export function useLandingInitiatives() {
  return useQuery({
    queryKey: initiativeKeys.all,
    queryFn: () => initiativeResolver.resolveAll(),
    staleTime: 120_000, // 2 min — landing data is not real-time critical
  });
}
```

**Why not reuse `useInitiatives()`?** The existing `useInitiatives()` is gated by `VITE_USE_INITIATIVE_READ_MODEL`. The landing page should always use the Initiative model regardless of the flag. This is a read-only public surface.

### 4.3 Existing capabilities we reuse

| Capability                        | Source                         | Phase 2 usage                                   |
| --------------------------------- | ------------------------------ | ----------------------------------------------- |
| `Initiative.lifecycle`            | `initiative.ts:19-24`          | Stats derivation, card badges, region breakdown |
| `Initiative.participantsCount`    | `initiative.ts:256`            | Stats (total movilizados)                       |
| `Initiative.supportersCount`      | `initiative.ts:257`            | Stats (total apoyos)                            |
| `Initiative.temporalAnchor.label` | `initiative.ts:80`             | Card secondary text                             |
| `classifyDistrictActivity()`      | `territoryAggregations.ts:47`  | Vitality banner coloring                        |
| `deriveMovementDirection()`       | `territoryAggregations.ts:122` | Vitality banner arrows                          |
| `deriveAmbientSignal()`           | `ambient.ts`                   | Ambient pulse (unchanged)                       |
| `selectFeedItems()`               | `missionSelection.ts:95`       | Dashboard feed (unchanged)                      |
| `buildTerritory()`                | `missionSelection.ts:109`      | Region cards (now gets Initiative data)         |

---

## 5. Queries Requeridas

### 5.1 Landing page queries

| Query                     | Source                                 | Replaces                                                | Stale time |
| ------------------------- | -------------------------------------- | ------------------------------------------------------- | ---------- |
| `useLandingInitiatives()` | `initiativeResolver.resolveAll()`      | `useMissions()`                                         | 120s       |
| `useProposals()` (keep)   | `proposalRepository.getAllProposals()` | Only for `buildTerritorialSummaryFromEntities` fallback | 60s        |

**No new backend queries.** The `initiativeResolver.resolveAll()` already fetches missions and proposals in parallel. We just need a new frontend hook that isn't gated by the feature flag.

### 5.2 Dashboard queries

| Query                         | Source                   | Change    |
| ----------------------------- | ------------------------ | --------- |
| `useCivicFeed()`              | Already Initiative-aware | No change |
| `useProfileMissionTimeline()` | Auth-bound               | No change |

### 5.3 Derived data (computed client-side)

| Derivation                           | Input                        | Cost             |
| ------------------------------------ | ---------------------------- | ---------------- |
| `deriveInitiativeStats(initiatives)` | `Initiative[]`               | O(n)             |
| `aggregateByRegion(initiatives)`     | `Initiative[]`               | O(n)             |
| `selectTopDistricts(districts)`      | `TerritorialImpactSummary[]` | O(n)             |
| `deriveAmbientSignal(events)`        | `TerritorialEvent[]`         | O(n) (unchanged) |

All derivations are pure functions, computed in `useMemo`. No server load.

---

## 6. Componentes Afectados

### 6.1 New components

| Component               | Location                                                 | Responsibility                                           | Replaces                                      |
| ----------------------- | -------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| `InitiativeSnapshot`    | `src/features/home/components/InitiativeSnapshot.tsx`    | 3 real initiative cards for hero area (landing)          | Hardcoded floating expedition cards (3 items) |
| `StatsRow`              | `src/features/home/components/StatsRow.tsx`              | Compact lifecycle stats for dashboard                    | Nothing (additive)                            |
| `VitalityBanner`        | `src/features/home/components/VitalityBanner.tsx`        | Horizontally scrollable top districts                    | Nothing (additive)                            |
| `InitiativeCard`        | `src/features/home/components/InitiativeCard.tsx`        | Single initiative card with lifecycle badge + action CTA | Shared across snapshot + expeditions          |
| `RegionAggregationCard` | `src/features/home/components/RegionAggregationCard.tsx` | Region card showing lifecycle breakdown                  | Inline region cards (upgrade)                 |

### 6.2 Modified components

| Component                 | File                             | Change                                                                                                                                                                                                                                                             |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Landing`                 | `src/routes/index.tsx`           | Replace `useMissions()` with `useLandingInitiatives()`; replace all `deriveStatsFromMissions` with `deriveInitiativeStats`; replace hardcoded floating cards with `<InitiativeSnapshot>`; add `<VitalityBanner>`; upgrade region cards to show lifecycle breakdown |
| `Dashboard`               | `src/routes/app.index.tsx`       | Add `<StatsRow>` between hero and footprint; add `<VitalityBanner>` between regions and ambient; upgrade region cards to show lifecycle breakdown                                                                                                                  |
| `PeruTerritoryDecoration` | `src/routes/index.tsx:157`       | Accept `Initiative[]` instead of region counts; show lifecycle counts per region                                                                                                                                                                                   |
| `deriveStatsFromMissions` | `src/routes/index.tsx:66`        | Delete (replaced by `deriveInitiativeStats`)                                                                                                                                                                                                                       |
| `selectFeedItems`         | `src/domain/missionSelection.ts` | No change needed (already generic)                                                                                                                                                                                                                                 |

### 6.3 New domain files

| File                                                      | Content                                                 |
| --------------------------------------------------------- | ------------------------------------------------------- |
| `src/domain/initiativeStats.ts`                           | `deriveInitiativeStats()`, `InitiativeStats` type       |
| `src/domain/regionAggregations.ts`                        | `aggregateByRegion()`, `RegionAggregation` type         |
| `src/domain/districtVitalitySummary.ts`                   | `selectTopDistricts()`, `DistrictVitalitySnapshot` type |
| `src/features/initiatives/hooks/useLandingInitiatives.ts` | `useLandingInitiatives()` hook                          |

### 6.4 Components deleted

| Component                                                           | Reason                                  |
| ------------------------------------------------------------------- | --------------------------------------- |
| `deriveStatsFromMissions` (inline function)                         | Replaced by `deriveInitiativeStats`     |
| Hardcoded floating cards (lines 530-597)                            | Replaced by real `<InitiativeSnapshot>` |
| `PeruTerritoryDecoration` props `costaCount/sierraCount/selvaCount` | Replaced by `Initiative[]`              |

---

## 7. UX Flow — Detailed Walkthrough

### 7.1 Landing page — first paint

```
1. useLandingInitiatives() fires
2. Loading state: skeleton pulse on snapshot cards, stats show hyphens
3. Data arrives (or empty):
   a. Hero badge shows total active initiatives
   b. Stats row shows 3 numbers (supporters, districts, total)
   c. Peru SVG shows lifecycle counts per region
   d. InitiativeSnapshot renders 3 cards (or fallback)
   e. Observatory shows 4 stats from Initiative lifecycle
   f. "Elige tu paisaje" shows lifecycle breakdown per region
   g. VitalityBanner shows top 5 districts (or nothing if empty)
   h. Expediciones shows featured initiatives grid
```

### 7.2 Dashboard — post-auth

```
1. useCivicFeed() fires (existing)
2. StatsRow renders: forming / active / completed counts
3. VitalityBanner renders: top 5 districts from non-empty regions
4. Region cards render: lifecycle breakdown instead of just "X activas"
5. Feed renders: same as Phase 1 (already Initiative-aware)
```

### 7.3 Empty state behavior

| Surface            | Empty behavior                                                   |
| ------------------ | ---------------------------------------------------------------- |
| Hero badge         | Same: "Iniciativas nacen desde cada territorio"                  |
| InitiativeSnapshot | Same fallback: 3 placeholder cards + "Sé quien inicia algo aquí" |
| StatsRow           | All zeros: "0 formándose · 0 activas · 0 completadas"            |
| VitalityBanner     | Hidden (nothing to show)                                         |
| Observatory        | Always visible (was hidden on zero in Phase 1)                   |
| Region cards       | "Sin actividad" per region; lifecycle row hidden                 |
| Expediciones       | Same fallback: 3 placeholder cards                               |

---

## 8. Impacto Esperado

### 8.1 Perceptual impact

| Metric                             | Before (Phase 1)      | After (Phase 2)                          |
| ---------------------------------- | --------------------- | ---------------------------------------- |
| Proposals visible on landing       | ✗ (hidden)            | ✓ (in stats, cards, region counts)       |
| Lifecycle visible on landing cards | ✗ (no badge)          | ✓ (forming/active/completed badges)      |
| Stats include supporters           | ✗ (only participants) | ✓ (supporters + participants)            |
| "X misiones" labels                | Only missions         | "X iniciativas" (both types)             |
| Floating cards                     | Hardcoded             | Real data, changes as initiatives change |
| Territorial vitality               | None                  | District vitality banner shows movement  |
| Observatory hidden on zero         | ✓ (hidden section)    | ✗ (always visible, honest 0s)            |
| Dashboard lifecycle visibility     | None                  | Compact stats row                        |

### 8.2 Performance impact

| Aspect                  | Impact                     | Mitigation                                                       |
| ----------------------- | -------------------------- | ---------------------------------------------------------------- |
| New query on landing    | +1 parallel query          | Resolver fetches missions+proposals in parallel; 120s stale time |
| Client-side derivations | 3 new `useMemo` calls      | All O(n), same as existing ambient derivation                    |
| Bundle size             | +4 new domain files (tiny) | Pure functions, no dependencies                                  |

### 8.3 Auth boundary

The landing page (`/`) is public. The new `useLandingInitiatives()` hook must NOT require auth. Currently `initiativeResolver.resolveAll()` uses `missionRepository.findAll()` and `proposalRepository.getAllProposals()` — need to verify both work without auth. If `getAllProposals()` requires auth, a new public proposal query is needed.

**Risk:** `proposalRepository.getAllProposals()` may be auth-gated. If so, the landing page resolver falls back to missions-only for proposals, or we create a public proposal endpoint.

### 8.4 Feature flag interaction

The landing page Phase 2 works **independently** of `VITE_USE_INITIATIVE_READ_MODEL`. The landing always uses the Initiative resolver for its own stats. The dashboard continues to use `useCivicFeed()` which is already flag-gated. No conflict.

---

## 9. Implementation Order

| Phase | Step                                        | File                                                            | Effort | Dependencies                      |
| ----- | ------------------------------------------- | --------------------------------------------------------------- | ------ | --------------------------------- |
| 2a    | Create `deriveInitiativeStats()` + type     | `src/domain/initiativeStats.ts` (NEW)                           | 30 min | None                              |
| 2a    | Create `aggregateByRegion()` + type         | `src/domain/regionAggregations.ts` (NEW)                        | 20 min | None                              |
| 2a    | Create `selectTopDistricts()` + type        | `src/domain/districtVitalitySummary.ts` (NEW)                   | 20 min | `territoryAggregations.ts`        |
| 2a    | Create `useLandingInitiatives()` hook       | `src/features/initiatives/hooks/useLandingInitiatives.ts` (NEW) | 15 min | `initiativeResolver`              |
| 2b    | Build `<InitiativeSnapshot>` (3 real cards) | `src/features/home/components/InitiativeSnapshot.tsx` (NEW)     | 1h     | 2a domain functions               |
| 2b    | Build `<StatsRow>` (compact stats)          | `src/features/home/components/StatsRow.tsx` (NEW)               | 30 min | `deriveInitiativeStats`           |
| 2b    | Build `<VitalityBanner>` (district chips)   | `src/features/home/components/VitalityBanner.tsx` (NEW)         | 1h     | `selectTopDistricts`              |
| 2b    | Build `<InitiativeCard>` (shared card)      | `src/features/home/components/InitiativeCard.tsx` (NEW)         | 45 min | lifecycle badge, CTA logic        |
| 2b    | Upgrade `<RegionAggregationCard>`           | Refactor inline region cards                                    | 30 min | `aggregateByRegion`               |
| 2c    | Upgrade landing page                        | `src/routes/index.tsx`                                          | 2h     | All 2a + 2b                       |
| 2c    | Upgrade dashboard                           | `src/routes/app.index.tsx`                                      | 1h     | StatsRow, VitalityBanner          |
| 2c    | Update PeruTerritoryDecoration              | `src/routes/index.tsx`                                          | 20 min | Initiative lifecycle data         |
| 2d    | Delete `deriveStatsFromMissions`            | `src/routes/index.tsx`                                          | 5 min  | After migration verified          |
| 2d    | Remove hardcoded floating cards             | `src/routes/index.tsx`                                          | 10 min | After InitiativeSnapshot verified |

**Total:** ~8-9 hours across 4 sub-phases.

---

## 10. Rollout Strategy

### Feature flag

```typescript
// src/lib/operationalFeature.ts
export function isHomepagePhase2Enabled(): boolean {
  return import.meta.env.VITE_HOMEPAGE_PHASE_2 === "true";
}
```

Not strictly necessary since all changes are additive (new components, new domain functions). The landing page upgrade is a single file change (`index.tsx`) that can be toggled by conditionally rendering Phase 1 vs Phase 2 sections. But a flag provides safety.

### Rollback per surface

| Surface                | Rollback method                        |
| ---------------------- | -------------------------------------- |
| Landing stats          | Revert to `deriveStatsFromMissions`    |
| Landing cards          | Revert to hardcoded floating cards     |
| Landing region cards   | Revert to `missionsByRegion`           |
| VitalityBanner         | Remove from JSX                        |
| StatsRow               | Remove from JSX                        |
| Dashboard region cards | Revert to old `buildTerritory` display |

Each rollback is a single edit in the route file. No data loss.

### Migration verification

| Check                                       | Method                                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Stats include proposals                     | Spot check: create a proposal, verify landing observatory count increases                          |
| Lifecycle badges correct                    | Visual: verify forming shows "En formación", active shows "En curso", completed shows "Completada" |
| Vitality banner shows only active districts | District with zero activity should not appear                                                      |
| Card actions match lifecycle                | Forming → "Apoyar", Active → "Unirme", Completed → "Ver resultados"                                |
| No auth required for landing                | Private browser window loads landing fully                                                         |
| Dashboard stats match                       | StatsRow counts match initiative list                                                              |
