# Audit: InitiativeMapEntity Architecture — Definitive Contract

**Status:** Audit  
**Date:** 2026-06-10  
**Scope:** Mapa, homepage territorial, district pages, vitality systems

---

## 0. Executive Summary

The migration from Mission+Proposal to a unified Initiative model is architecturally sound but has two critical gaps:

1. **Four Mission-only fields** (xp, spotsLeft, difficulty, impact) have no equivalent in the Initiative domain and are consumed by sidebar, drawer, and MapView preview cards. These cannot be removed without UX regression.
2. **The type discriminator `entityType` vs `sourceType`** splits the codebase. CivicEntity, filters, and vitality pipelines use `entityType`. Initiative uses `sourceType`. Any unified entity must pick one.

The proposed `InitiativeMapEntity` solves both by adding optional Layer B fields (Mission compat) and standardizing on `sourceType` as the discriminator.

---

## 1. Complete Field Inventory — All Map Surfaces

### 1.1 Marker Layer (`useMissionMarkerLayer.ts`)

| Field                     | Access path                       | Required? | Notes                                                           |
| ------------------------- | --------------------------------- | --------- | --------------------------------------------------------------- |
| `id`                      | `mission.id`                      | Required  | Used as marker key and for selection. Must be raw UUID.         |
| `coords.lat`              | `mission.coords.lat`              | Required  | Marker position. Guarded by `isValidLatLng`.                    |
| `coords.lng`              | `mission.coords.lng`              | Required  | Same                                                            |
| `region`                  | `mission.region`                  | Required  | Gradient, glow, chip class                                      |
| `lifecycleInfo.lifecycle` | `mission.lifecycleInfo.lifecycle` | Required  | → `deriveLifecycleFromMission` → `getLifecyclePresentation`     |
| `emoji`                   | `mission.emoji`                   | Required  | Pin icon                                                        |
| `title`                   | `mission.title`                   | Required  | Popup title                                                     |
| `district`                | `mission.district`                | Required  | Popup location                                                  |
| **proposalIds**           | `proposalIds?.has(mission.id)`    | **DEAD**  | Parameter never sent from MapView. `isProposal` always `false`. |

### 1.2 Sidebar Detail Panel (`app.mapa.tsx:263-364`)

| Field         | Access path                 | Required? | Notes                                   |
| ------------- | --------------------------- | --------- | --------------------------------------- |
| `id`          | `activeMission.id`          | Required  | Route param to `/app/mision/$missionId` |
| `region`      | `activeMission.region`      | Required  | Gradient                                |
| `emoji`       | `activeMission.emoji`       | Required  | Header                                  |
| `category`    | `activeMission.category`    | Required  | Header                                  |
| `title`       | `activeMission.title`       | Required  | Header                                  |
| `district`    | `activeMission.district`    | Required  | Location link                           |
| `description` | `activeMission.description` | Required  | Body text                               |
| `xp`          | `activeMission.xp`          | Required  | Stats grid                              |
| `spotsLeft`   | `activeMission.spotsLeft`   | Required  | Stats grid                              |
| `difficulty`  | `activeMission.difficulty`  | Required  | Stats grid                              |
| `impact`      | `activeMission.impact`      | Required  | Impact section                          |

### 1.3 Bottom Drawer (`app.mapa.tsx:423-527`)

| Field              | Access path                      | Required? | Notes                    |
| ------------------ | -------------------------------- | --------- | ------------------------ |
| `region`           | `activeMission.region`           | Required  | Gradient                 |
| `category`         | `activeMission.category`         | Required  | Header                   |
| `title`            | `activeMission.title`            | Required  | Header                   |
| `lifecycleInfo`    | `activeMission.lifecycleInfo`    | Required  | → `computeMissionAnchor` |
| `startDate`        | `activeMission.startDate`        | Required  | → `computeMissionAnchor` |
| `endDate`          | `activeMission.endDate`          | Required  | → `computeMissionAnchor` |
| `district`         | `activeMission.district`         | Required  | Location link            |
| `emoji`            | `activeMission.emoji`            | Required  | Visual                   |
| `description`      | `activeMission.description`      | Required  | Body                     |
| `xp`               | `activeMission.xp`               | Required  | Stats                    |
| `spotsLeft`        | `activeMission.spotsLeft`        | Required  | Stats                    |
| `difficulty`       | `activeMission.difficulty`       | Required  | Stats                    |
| `impact`           | `activeMission.impact`           | Required  | Stats                    |
| `organizer`        | `activeMission.organizer`        | Optional  | Conditional render       |
| `organizer.name`   | `activeMission.organizer.name`   | Optional  | Conditional              |
| `organizer.avatar` | `activeMission.organizer.avatar` | Optional  | Conditional              |

### 1.4 MapView Preview Cards (`MapView.tsx:768-807`)

| Field           | Access path       | Required? | Notes                    |
| --------------- | ----------------- | --------- | ------------------------ |
| `id`            | `m.id`            | Required  | Selection                |
| `emoji`         | `m.emoji`         | Required  | Visual                   |
| `title`         | `m.title`         | Required  | Text                     |
| `district`      | `m.district`      | Required  | Location                 |
| `xp`            | `m.xp`            | Required  | XP badge                 |
| `lifecycleInfo` | `m.lifecycleInfo` | Required  | → `computeMissionAnchor` |
| `startDate`     | `m.startDate`     | Required  | → `computeMissionAnchor` |
| `endDate`       | `m.endDate`       | Required  | → `computeMissionAnchor` |

### 1.5 MapView Territorial Discovery Panel (`MapView.tsx:740-766`)

| Field          | Access path      | Required?          | Notes                                        |
| -------------- | ---------------- | ------------------ | -------------------------------------------- |
| `entityType`   | `m.entityType`   | Required           | Discriminator (mission → count participants) |
| `participants` | `m.participants` | Required (mission) | Total explorers                              |
| `category`     | `m.category`     | Required           | Dominant category                            |
| `region`       | `m.region`       | Required           | Filter                                       |

### 1.6 Filters (`useMissionMapFilters.ts`)

| Field         | Access path           | Required?          | Notes                                               |
| ------------- | --------------------- | ------------------ | --------------------------------------------------- |
| `region`      | `mission.region`      | Required           | Filter                                              |
| `district`    | `mission.district`    | Required           | Filter                                              |
| `category`    | `mission.category`    | Required           | Filter                                              |
| `difficulty`  | `mission.difficulty`  | Required (mission) | Guarded by `isMission()`                            |
| `title`       | `mission.title`       | Required           | Search                                              |
| `description` | `mission.description` | Required           | Search                                              |
| `coords`      | `mission.coords`      | Required           | Proximity filter                                    |
| `entityType`  | `mission.entityType`  | Required           | Discriminator for `isMission()` → difficulty filter |

### 1.7 District Warmth (`app.mapa.tsx:80-96`)

| Field                 | Access path                            | Required?           | Notes                            |
| --------------------- | -------------------------------------- | ------------------- | -------------------------------- |
| `district`            | `e.district`                           | Required            | Grouping key                     |
| `entityType`          | `e.entityType`                         | Required            | → `isMission()` / `isProposal()` |
| `status`              | `(Mission).status`                     | Required (mission)  | → completedMissionCount          |
| `_proposal.status`    | `(ProposalEntity)._proposal.status`    | Required (proposal) | → activeProposalCount            |
| `_proposal.createdAt` | `(ProposalEntity)._proposal.createdAt` | Required (proposal) | → recentProposalCount            |
| `date`                | `e.date`                               | Required            | → lastActivityAt                 |

### 1.8 Initiative Feed Section (`app.mapa.tsx:367-421`)

Already uses `Initiative[]` directly. Fields consumed:

- `initiative.id`, `initiative.region`, `initiative.emoji`, `initiative.sourceType`, `initiative.sourceId`, `initiative.lifecycle`, `initiative.title`, `initiative.location?.district`, `initiative.temporalAnchor.label`

No drift — this is the reference implementation.

---

## 2. Complete Mission Type

```ts
// src/types/domain.ts:34-59
type Mission = {
  id: string; // raw UUID
  title: string;
  description: string;
  district: string;
  districtId?: string | null;
  region: Region;
  category: MissionCategory;
  xp: number;
  participants: number;
  spotsLeft: number;
  date: string;
  distanceKm: number;
  impact: string;
  difficulty: MissionDifficulty;
  organizer: { name: string; avatar: string };
  coords: MapCoords;
  emoji: string;
  status?: "proposed" | "active" | "completed";
  startDate: string | null;
  endDate: string | null;
  lifecycleInfo: MissionLifecycleInfo;
};
```

**21 fields total.** Map surfaces consume 17 of them (all except `distanceKm`, `status`, `districtId`, `lifecycleInfo` is consumed indirectly via `deriveLifecycleFromMission`/`computeMissionAnchor`).

### Fields NOT consumed by any map surface (candidates for exclusion):

- `distanceKm` — never rendered on map
- `status` — superseded by `lifecycleInfo.lifecycle`

---

## 3. Definitive InitiativeMapEntity Contract

```ts
// src/domain/initiativeMapEntity.ts — DEFINITIVE CONTRACT

import type { InitiativeLifecycle, TemporalAnchor } from "./initiative";
import type { Region } from "./regions";
import type { MissionCategory, MissionDifficulty } from "@/types";

/**
 * InitiativeMapEntity — Single Spatial Read Model.
 *
 * Unifies Mission and Proposal into one type for map rendering,
 * territorial intelligence, homepage snapshots, and district pages.
 *
 * Layer A: fields present for ALL initiatives (from Initiative read model).
 * Layer B: fields present ONLY for Mission-sourced initiatives (optional).
 *
 * This is a DERIVED type, not stored. Built at render time by buildMapEntity().
 */
export type InitiativeMapEntity = {
  // ── Identity ────────────────────────────────────────────────────────
  /** Raw UUID from source record. Used for selection + marker key + routing. */
  id: string;
  /** Prefixed ID: "mission_<uuid>" or "proposal_<uuid>". Used for React keys in lists. */
  prefixedId: string;
  /** Source discriminator — replaces old "entityType". */
  sourceType: "mission" | "proposal";

  // ── Content (Layer A — always present) ──────────────────────────────
  title: string;
  summary: string;
  category: MissionCategory;
  region: Region;
  emoji: string;
  lifecycle: InitiativeLifecycle;
  temporalAnchor: TemporalAnchor;
  /** Location may be null if the source record lacks coordinates. */
  location: {
    district: string;
    districtId: string | null;
    region: Region;
    coords: { lat: number; lng: number } | null;
  } | null;

  // ── Participation (Layer A — may be 0) ──────────────────────────────
  participantsCount: number;
  supportersCount: number;

  // ── Vitality (Layer A — optional, computed by enricher) ─────────────
  vitalityScore?: number;

  // ── Temporal (Layer A — for recency ordering) ───────────────────────
  /** ISO timestamp of last activity. Used for "lastActivityAt" and sorting. */
  lastActivityAt: string;

  // ── Mission-only compat (Layer B — optional, only when sourceType === "mission") ─
  /** XP reward. */
  xp?: number;
  /** Available spots. */
  spotsLeft?: number;
  /** Difficulty level. */
  difficulty?: MissionDifficulty;
  /** Impact description. */
  impact?: string;
  /** Organizer info. */
  organizer?: { name: string; avatar: string } | null;
  /** Full description (summary may be truncated). */
  description?: string | null;
  /** Raw start date for legacy anchor computation. */
  startDate?: string | null;
  /** Raw end date for legacy anchor computation. */
  endDate?: string | null;
};
```

### Fields that changed from the RFC draft

| RFC Draft                              | Definitive                                         | Rationale                                                                                                  |
| -------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `id: string` (prefixed)                | `prefixedId: string`                               | Marker layer and selection use raw UUID. Prefixed ID only used for React keys. Renamed to avoid ambiguity. |
| `sourceId: string`                     | `id: string`                                       | Renamed for clarity. Every map operation uses this raw UUID.                                               |
| `location: InitiativeLocation \| null` | Inlined `{ district, districtId, region, coords }` | Avoids import coupling to `initiative.ts`. Keeps entity self-contained.                                    |
| `participantsCount?: number`           | `participantsCount: number` (required, default 0)  | Used in territorial discovery panel unconditionally.                                                       |
| `supportersCount?: number`             | `supportersCount: number` (required, default 0)    | Same reason.                                                                                               |
| (missing)                              | `lastActivityAt: string`                           | Required for ambient signal derivation and vitality recency.                                               |
| `difficulty?: string`                  | `difficulty?: MissionDifficulty`                   | Proper type, not string.                                                                                   |
| (missing)                              | `vitalityScore?: number`                           | Used by territorial intelligence pipeline for district warmth.                                             |

### Fields that should NOT exist on InitiativeMapEntity

| Field           | Reason                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `entityType`    | Replaced by `sourceType`. Adding both creates drift risk.                                                                                      |
| `_proposal`     | Backreference to raw Proposal type. The entity should be self-contained. Proposal-specific data is either on Layer A or not needed on the map. |
| `distanceKm`    | Never consumed by any map surface.                                                                                                             |
| `status`        | Superseded by `lifecycle`.                                                                                                                     |
| `lifecycleInfo` | Superseded by `lifecycle`. Temporal anchors via `temporalAnchor` and `startDate`/`endDate` for legacy.                                         |

---

## 4. buildMapEntity() — función pura

```ts
// src/domain/initiativeMapEntity.ts

import type { Initiative } from "./initiative";
import type { Mission } from "@/types";
import type { InitiativeMapEntity } from "./initiativeMapEntity";

/**
 * Builds an InitiativeMapEntity from an Initiative + optional Mission data.
 *
 * Pure function. No I/O, no side effects.
 * Layer B fields are injected only when sourceType === "mission"
 * and missionCompat is provided.
 */
export function buildMapEntity(
  initiative: Initiative,
  missionCompat?: {
    id: string;
    xp: number;
    spotsLeft: number;
    difficulty: string;
    impact: string;
    organizer: { name: string; avatar: string } | null;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
  },
): InitiativeMapEntity {
  return {
    // ── Identity ──
    id: initiative.sourceId,
    prefixedId: initiative.id,
    sourceType: initiative.sourceType,

    // ── Content ──
    title: initiative.title,
    summary: initiative.summary,
    category: initiative.category,
    region: initiative.region,
    emoji: initiative.emoji,
    lifecycle: initiative.lifecycle,
    temporalAnchor: initiative.temporalAnchor,
    location: initiative.location ?? null,

    // ── Participation ──
    participantsCount: initiative.participantsCount ?? 0,
    supportersCount: initiative.supportersCount ?? 0,

    // ── Vitality ──
    vitalityScore: initiative.vitalityScore,

    // ── Temporal ──
    lastActivityAt: initiative.location?.district
      ? /* actual last activity — may need enrichment */ new Date().toISOString()
      : new Date().toISOString(),

    // ── Layer B (Mission compat) ──
    ...(missionCompat && {
      xp: missionCompat.xp,
      spotsLeft: missionCompat.spotsLeft,
      difficulty: missionCompat.difficulty as MissionDifficulty,
      impact: missionCompat.impact,
      organizer: missionCompat.organizer,
      description: missionCompat.description,
      startDate: missionCompat.startDate,
      endDate: missionCompat.endDate,
    }),
  };
}
```

**Note on `lastActivityAt`:** This field needs enrichment from the source record's timestamps. For missions it's `mission.date`, for proposals it's `proposal.createdAt`. The `initiativeResolver` should expose this after enrichment. Currently the Initiative type doesn't have a `lastActivityAt` field — this is a gap that needs to be added to `Initiative`.

---

## 5. Duplications, Coupling & Risks

### 5.1 Duplications

| What                                                      | Where                                       | Redundant with                                             |
| --------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| `lifecycleInfo.lifecycle` → `deriveLifecycleFromMission`  | Marker layer, MapView preview cards, drawer | `Initiative.lifecycle` (already derived in resolver)       |
| `computeMissionAnchor(lifecycleInfo, startDate, endDate)` | Sidebar, drawer, MapView preview cards      | `Initiative.temporalAnchor` (already computed in resolver) |
| `entityType` discriminator                                | Filters, sidebar filter, vitality pipeline  | `sourceType` on Initiative                                 |
| `proposalIds` parameter                                   | Marker layer type (never used)              | `sourceType` check would make it unnecessary               |
| `mission.id` (raw UUID) vs `initiative.id` (prefixed)     | Three-way ID logic                          | Normalize to raw UUID for map, prefixed for lists          |

### 5.2 Hidden Coupling

| Coupling                                               | Location                     | Problem                                                                                                                                           |
| ------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isMission()` guard → `m.participants`                 | `MapView.tsx:146`            | Casts CivicEntity to Mission. After migration, must use `sourceType === "mission"` + `participantsCount`.                                         |
| `isMission()` guard → `mission.difficulty` filter      | `useMissionMapFilters.ts:93` | Difficulty filter silently skips proposals. After migration, must check `sourceType === "mission"` before accessing `.difficulty`.                |
| `entityType !== "proposal"`                            | `app.mapa.tsx:75`            | After migration, must become `sourceType === "mission"`. Silent bug when using Initiative (which has no entityType, so filter passes all).        |
| `buildTerritorialSummaryFromEntities`                  | `app.mapa.tsx:91`            | Depends on `CivicEntity` shape with `entityType`, `_proposal`, `status`. After migration, needs a new overload accepting `InitiativeMapEntity[]`. |
| `civicEntitiesToAmbientEvents` → `deriveAmbientSignal` | `app.index.tsx:92`           | Depends on `CivicEntity`. After migration, needs adapter for `InitiativeMapEntity[]`.                                                             |

### 5.3 `as any` Casts

| Location                                               | Line                           | Risk                                                                 |
| ------------------------------------------------------ | ------------------------------ | -------------------------------------------------------------------- |
| `app.mapa.tsx` var `allMapItems`                       | N/A (no `as any` currently)    | **Clean.** `allMapItems` is correctly typed as `CivicEntity[]`.      |
| Previous RFC mentioned `initiatives as any`            | RFC section 2                  | **Removed.** Current code has separate feed section instead of cast. |
| `MarkerLayerOptions` type uses `LeafletInstance = any` | `useMissionMarkerLayer.ts:12`  | **Tolerable.** Leaflet typing limitation.                            |
| `getPopup()` result cast to `any`                      | `useMissionMarkerLayer.ts:147` | **Tolerable.** Leaflet typing limitation.                            |

### 5.4 `sourceType`/`entityType` Drift

| Location                                      | Uses                                | Needs to become                            |
| --------------------------------------------- | ----------------------------------- | ------------------------------------------ |
| `app.mapa.tsx:75` filter                      | `m.entityType !== "proposal"`       | `e.sourceType === "mission"`               |
| `MapView.tsx:146` participants                | `m.entityType === "mission"`        | `e.sourceType === "mission"`               |
| `useMissionMapFilters.ts:93` difficulty guard | `isMission(mission)`                | `mission.sourceType === "mission"`         |
| `isMission()` / `isProposal()` type guards    | `entityType` discriminator          | Need new guards on `sourceType`            |
| `buildTerritorialSummaryFromEntities`         | `isMission(e)` / `isProposal(e)`    | New overload with `sourceType` checks      |
| `app.index.tsx` drawer                        | `isInitiative(item)` + `sourceType` | Already correct — reference implementation |

### 5.5 Migration Risks

| Risk                                                          | Severity                        | Mitigation                                                                            |
| ------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- |
| Sidebar receives undefined for xp/spotsLeft/difficulty/impact | **HIGH** (visual breakage)      | Default values: `xp ?? 0`, `spotsLeft ?? "—"`, `difficulty ?? "—"`, `impact ?? ""`    |
| Drawer crashes on missing organizer                           | **HIGH** (runtime error)        | Optional chaining: `activeMission.organizer?.name`                                    |
| Marker layer doesn't render proposals                         | **MEDIUM** (lost visibility)    | Replace `filter(isMission)` with entity loop. Use `sourceType` for shape distinction. |
| `computeMissionAnchor` called on proposals                    | **MEDIUM** (wrong anchor)       | Use `temporalAnchor.label` directly. Remove raw `startDate`/`endDate` dependency.     |
| District warmth returns zero for all districts                | **MEDIUM** (lost feature)       | New `buildTerritorialSummaryFromEntities` overload for `InitiativeMapEntity[]`        |
| Filters break because `difficulty` missing from proposals     | **LOW** (filter silently skips) | Guard with `sourceType === "mission"` before accessing difficulty                     |
| `entityType` references missed during grep                    | **LOW** (build error)           | Strict type check — use grep for `entityType` across all migrated files               |
| Ambient signal breaks                                         | **LOW**                         | Adapter function `initiativeMapEntityToTerritorialEvent()`                            |

---

## 6. Single Spatial Read Model — Feasibility

### Consumers that would use InitiativeMapEntity

| Consumer                   | Current type                          | Can migrate? | Adapter needed?                                                                                 |
| -------------------------- | ------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| Marker layer               | `Mission[]`                           | **Yes**      | Replace `isMission` filter with entity loop                                                     |
| Map popup                  | Inside marker layer                   | **Yes**      | Same                                                                                            |
| Sidebar detail panel       | `CivicEntity`                         | **Yes**      | Replace field paths, add defaults for Layer B                                                   |
| Bottom drawer              | `CivicEntity`                         | **Yes**      | Same                                                                                            |
| MapView preview cards      | `CivicEntity` (filtered to Mission)   | **Yes**      | Replace `computeMissionAnchor` with `temporalAnchor.label`                                      |
| MapView territorial panel  | `CivicEntity[]`                       | **Yes**      | Replace `entityType` with `sourceType`, `participants` with `participantsCount`                 |
| Filters                    | `CivicEntity[]`                       | **Yes**      | Replace `isMission()` guard with `sourceType` check                                             |
| District warmth            | `CivicEntity[]`                       | **Yes**      | New `buildTerritorialSummaryFromEntities` overload                                              |
| Initiative feed (existing) | `Initiative[]`                        | **Yes**      | Already uses Initiative — just map to IME for consistency                                       |
| Homepage stats             | `Mission[]`                           | **Yes**      | Already planned for Phase 2                                                                     |
| Homepage VitalityBanner    | N/A (new)                             | **Yes**      | Built on `selectTopDistricts`                                                                   |
| Dashboard feed             | `CivicEntity[] \| Initiative[]`       | **Yes**      | Minor field path update                                                                         |
| District pages             | `Mission[]` via `useDistrictActivity` | **Partial**  | District page fetches from district service hooks, not from entity list. Would need DTO change. |
| Ambient signal             | `CivicEntity[]`                       | **Yes**      | `initiativeMapEntityToTerritorialEvent()` adapter                                               |

### Consumers that would NOT use InitiativeMapEntity

| Consumer               | Reason                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| Mission detail page    | Renders full Mission type. Not a map/spatial surface.                   |
| Proposal detail page   | Renders full Proposal type. Not a map/spatial surface.                  |
| Profile lists          | Read-only navigation. Not a spatial surface.                            |
| PublicMissionCard      | Uses CivicEntity. Could be refactored but is a card, not a map surface. |
| District service hooks | Use dedicated district DB queries, not entity lists.                    |

### Verdict: **YES, with caveats**

`InitiativeMapEntity` can serve as the Single Spatial Read Model for:

- **Map** (all 7 surfaces: markers, popup, sidebar, drawer, preview cards, territorial panel, feed)
- **Homepage territorial** (stats, VitalityBanner, InitiativeSnapshot — Phase 2)
- **Vitality systems** (district warmth, ambient signal via adapters)
- **Filters** (search, region, category, proximity)

It cannot replace the district page entity pipeline (which uses dedicated DB queries) nor detail pages (which render full domain types).

---

## 7. Migration Strategy

### Phase 0 — Foundation (1-2h)

| Step | File                                 | Change                                                                               |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| 0.1  | `src/domain/initiativeMapEntity.ts`  | Create definitive type + `buildMapEntity()`                                          |
| 0.2  | `src/domain/initiative.ts`           | Add `lastActivityAt: string` to `Initiative`                                         |
| 0.3  | `src/services/initiativeResolver.ts` | Populate `lastActivityAt` from source timestamps                                     |
| 0.4  | `src/services/mapEntityResolver.ts`  | Create resolver returning `InitiativeMapEntity[]` (parallel to `initiativeResolver`) |

### Phase 1 — Marker Layer (2-3h)

| Step | File                       | Change                                                                           |
| ---- | -------------------------- | -------------------------------------------------------------------------------- |
| 1.1  | `useMissionMarkerLayer.ts` | Accept `InitiativeMapEntity[]`, remove `proposalIds`, use `sourceType` for shape |
| 1.2  | `useMissionMarkerLayer.ts` | Use `entity.lifecycle` directly (no `deriveLifecycleFromMission`)                |
| 1.3  | `useMissionMarkerLayer.ts` | Use `entity.location.coords` instead of `mission.coords`                         |
| 1.4  | `MapView.tsx`              | Pass `InitiativeMapEntity[]` to marker layer                                     |

### Phase 2 — MapView Preview Cards (1-2h)

| Step | File                  | Change                                                                                    |
| ---- | --------------------- | ----------------------------------------------------------------------------------------- |
| 2.1  | `MapView.tsx:768-807` | Use `entity.temporalAnchor.label` instead of `computeMissionAnchor`                       |
| 2.2  | `MapView.tsx:768-807` | Use `entity.participantsCount` + `sourceType` instead of `isMission()` + `m.participants` |
| 2.3  | `MapView.tsx:740-766` | Update territorial panel to use `sourceType` discriminator                                |

### Phase 3 — Sidebar + Drawer (2-3h)

| Step | File                   | Change                                                                                                    |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| 3.1  | `app.mapa.tsx:75`      | Replace `entityType !== "proposal"` with `sourceType === "mission"`                                       |
| 3.2  | `app.mapa.tsx:265-364` | Replace all field paths. Add defaults: `xp ?? 0`, `spotsLeft ?? "—"`, `difficulty ?? "—"`, `impact ?? ""` |
| 3.3  | `app.mapa.tsx:431-527` | Replace `computeMissionAnchor()` with `entity.temporalAnchor.label`                                       |
| 3.4  | `app.mapa.tsx:431-527` | Add `organizer?.name` optional chaining                                                                   |
| 3.5  | `app.mapa.tsx:80-96`   | Replace `buildTerritorialSummaryFromEntities` with `InitiativeMapEntity` version                          |

### Phase 4 — Filters (1-2h)

| Step | File                      | Change                                                                            |
| ---- | ------------------------- | --------------------------------------------------------------------------------- |
| 4.1  | `useMissionMapFilters.ts` | Accept `InitiativeMapEntity[]` instead of `CivicEntity[]`                         |
| 4.2  | `useMissionMapFilters.ts` | Replace `isMission()` guard with `sourceType === "mission"` for difficulty filter |
| 4.3  | `useMissionMapFilters.ts` | Replace `mission.description` with `entity.summary` for search                    |

### Phase 5 — Homepage + Dashboard (Phase 2 integration)

| Step | File                   | Change                                                      |
| ---- | ---------------------- | ----------------------------------------------------------- |
| 5.1  | `routes/index.tsx`     | Use `InitiativeMapEntity[]` for stats, cards, region counts |
| 5.2  | `routes/app.index.tsx` | Use `InitiativeMapEntity[]` for feed, stats row             |
| 5.3  | `domain/ambient.ts`    | Add `initiativeMapEntityToTerritorialEvent()` adapter       |

### Phase 6 — Cleanup (1h)

| Step | File                                           | Change                                              |
| ---- | ---------------------------------------------- | --------------------------------------------------- |
| 6.1  | Remove `proposalIds` from marker layer type    | Dead parameter                                      |
| 6.2  | Remove `entityType` from all migrated surfaces | Replaced by `sourceType`                            |
| 6.3  | Deprecate `CivicEntity` for spatial use        | Keep only for non-spatial cards (PublicMissionCard) |

---

## 8. Checklist de Validación

### Before merge

- [ ] `InitiativeMapEntity` compiles without errors
- [ ] `buildMapEntity()` is pure (no I/O, no side effects)
- [ ] All Layer A fields are required or have sensible defaults
- [ ] All Layer B fields are optional
- [ ] `entityType` does not appear in any migrated file

### After marker layer migration

- [ ] Markers render for both missions and proposals
- [ ] Proposal markers show square + dashed border + 🌱
- [ ] Mission markers show filled circle + gradient + glow
- [ ] Lifecycle-based visual semantics match Phase 1 (forming: violeta suave, active: glow, ending: pulse, completed: faded, archived: hidden)
- [ ] Popup shows correct CTA label per lifecycle
- [ ] Popup "Ver más" opens drawer
- [ ] Marker click updates selection state
- [ ] Clustering works with mixed entity types

### After sidebar/drawer migration

- [ ] Sidebar panel renders for missions (full detail)
- [ ] Sidebar panel renders for proposals (simplified — no XP/spots/difficulty/impact)
- [ ] Drawer renders temporal anchor (not `computeMissionAnchor`)
- [ ] Drawer organizer section hides when `organizer` is undefined/null
- [ ] `xp`, `spotsLeft`, `difficulty`, `impact` show "—" when absent

### After filter migration

- [ ] Region filter works for all entities
- [ ] District filter works for all entities
- [ ] Category filter works for all entities
- [ ] Difficulty filter only applies to missions (not proposals)
- [ ] Search (title) works for all entities
- [ ] Proximity filter works for entities with valid coords

### After vitality migration

- [ ] District warmth (heatmap mode) shows correct levels
- [ ] District polygons color match `TerritorialActivityLevel`
- [ ] Empty districts show dormant color

### After homepage integration

- [ ] Observatory stats include both missions and proposals
- [ ] Region SVG labels show "X iniciativas" (not "X misiones")
- [ ] Snapshot cards show real data (not hardcoded)
- [ ] Vitality banner shows top districts

### Rollback readiness

- [ ] `VITE_USE_INITIATIVE_READ_MODEL` flag toggles between CivicEntity and InitiativeMapEntity paths
- [ ] Each phase is independently revertible
- [ ] No data is written or transformed server-side
- [ ] Old `CivicEntity` code paths still compile

---

## 9. Risks Final Summary

| #   | Risk                                         | Impact | Probability          | Mitigation                                  |
| --- | -------------------------------------------- | ------ | -------------------- | ------------------------------------------- |
| 1   | Sidebar gets undefined for Layer B fields    | High   | High                 | Default values at render (??)               |
| 2   | `entityType` grep misses                     | Medium | Medium               | TS strict mode catches mismatches           |
| 3   | Proposal markers never rendered              | Medium | High (current state) | Remove `.filter(isMission)` in marker layer |
| 4   | `buildTerritorialSummaryFromEntities` breaks | Medium | Low                  | Overload with InitiativeMapEntity           |
| 5   | `computeMissionAnchor` called on proposals   | Low    | Medium               | Use `temporalAnchor.label` everywhere       |
| 6   | Ambient signal breaks                        | Low    | Low                  | Adapter function                            |
| 7   | `lastActivityAt` enrichment unavailable      | Low    | High (gap)           | Add to Initiative type + resolver           |
| 8   | Clustering breaks with new ID format         | Low    | Low                  | All markers use raw UUID as key             |
| 9   | District page doesn't reflect changes        | Low    | Low                  | Uses dedicated queries, not entity list     |
