# RFC: Map Initiative Read Model Migration

**Status:** Draft  
**Author:** Architecture  
**Date:** 2026-06-10  
**Audience:** KUSQA engineering team  

---

## 1. Readiness Verdict: **NOT_READY**

The map surface cannot fully migrate to the Initiative Read Model in a single cutover. Four Mission-only fields block the sidebar and drawer. However, the marker layer and initiative feed can migrate immediately.

---

## 2. Current Architecture

```
app.mapa.tsx
  │
  ├── useMissions() ──► Mission[]
  ├── useAllProposals() ──► Proposal[]
  ├── useInitiatives() ──► Initiative[]
  │
  └── allMapItems: CivicEntity[] | Initiative[]
       │
       ├── filteredMissions ──► sidebarMissions (CivicEntity, entityType !== "proposal")
       │      │                      │
       │      │               activeMission (CivicEntity)
       │      │                      │
       │      │               ┌──── Sidebar Detail Panel
       │      │               └──── Bottom Drawer
       │      │
       │      └──► MapView (missions: Mission[])
       │               │
       │               ├── useMissionMarkerLayer (Mission[])
       │               └── Sidebar Preview Cards
       │
       └── initiativeFeed (Initiative[])
              │
              └── Initiative feed section
```

### Data flow under Initiative flag:

When `VITE_USE_INITIATIVE_READ_MODEL` is enabled:

```ts
allMapItems = initiatives as any;  // line 45, app.mapa.tsx
```

The `as any` is the first red flag. `sidebarMissions` filters by `m.entityType !== "proposal"`, but `Initiative` has no `entityType` — so all initiatives pass (since `undefined !== "proposal"` is `true`). Then the sidebar accesses `activeMission.xp`, `activeMission.spotsLeft`, etc. on `Initiative` objects that lack these fields, producing `undefined` / `NaN` in the UI.

**Initiative flag is NOT SAFE to enable for the map today.**

---

## 3. Field Inventory — Map Surface

### Layer A: Initiative-ready (can migrate immediately)

| Field | Where Used | Initiative equivalent |
|-------|-----------|---------------------|
| `id` | All surfaces | `Initiative.id` (prefixed) + `sourceId` (raw) |
| `title` | Marker popup, sidebar cards, feed | `Initiative.title` ✅ |
| `emoji` | Marker pin, sidebar, drawer | `Initiative.emoji` ✅ |
| `region` | Marker gradients, sidebar, drawer | `Initiative.region` ✅ |
| `category` | Sidebar, drawer | `Initiative.category` ✅ |
| `district` | Marker popup, sidebar cards, drawer | `Initiative.location.district` ✅ |
| `coords` | Marker positioning | `Initiative.location.coords` ✅ |
| `description` | Drawer detail | `Initiative.summary` (shorter but equivalent concept) |
| `lifecycleInfo.lifecycle` | Marker lifecycle derivation | `Initiative.lifecycle` ✅ (already derived) |
| `participants` | Stats counter | `Initiative.participantsCount` ✅ |
| `temporalAnchor` | Initiative feed | `Initiative.temporalAnchor` ✅ |

### Layer B: Initiative-absent (blockers)

| Field | Where Used | Why missing from Initiative |
|-------|-----------|---------------------------|
| `xp` | Sidebar cards (+N XP), sidebar detail panel, drawer stats | Not in Initiative resolver output |
| `spotsLeft` | Sidebar detail panel, drawer stats | Not in Initiative resolver output |
| `difficulty` | Sidebar detail panel, drawer stats | Not in Initiative resolver output |
| `impact` | Sidebar detail panel, drawer stats | Not in Initiative resolver output |
| `organizer.name` | Drawer detail | Not in Initiative resolver output |
| `organizer.avatar` | Drawer detail | Not in Initiative resolver output |
| `startDate` | `computeMissionAnchor()` call in sidebar/drawer | Replaced by `temporalAnchor.label` |
| `endDate` | `computeMissionAnchor()` call in sidebar/drawer | Replaced by `temporalAnchor.label` |

### Filter layer (blocker for unified list)

| Where | Current Pattern | Problem |
|-------|----------------|---------|
| `sidebarMissions` filter | `m.entityType !== "proposal"` | `Initiative` has `sourceType`, not `entityType` |
| `filteredMissions` filter | Uses `.region`, `.district`, `.category`, `.difficulty` | `Initiative` lacks `.difficulty` |
| Mission-only stats | `m.entityType === "mission" ? m.participants : 0` | `Initiative` uses `sourceType` |

---

## 4. InitiativeMapEntity Design

A projection type that unifies Initiative (Layer A) with Mission compatibility fields (Layer B).

```ts
// src/domain/initiativeMapEntity.ts

import type { Initiative, InitiativeLifecycle, TemporalAnchor, InitiativeLocation } from "./initiative";
import type { Region } from "./regions";

/**
 * Map-specific projection of an initiative.
 *
 * Layer A: Initiative-driven (always present — from Initiative read model)
 * Layer B: Mission compatibility (nullable — only present when source is a Mission)
 *
 * This is NOT stored. Derived at render time.
 */
export type InitiativeMapEntity = {
  // ── Layer A: Initiative-driven ──────────────────────────────────────
  /** Prefixed ID: "mission_<uuid>" or "proposal_<uuid>" */
  id: string;
  /** Raw UUID from the source record */
  sourceId: string;
  sourceType: "mission" | "proposal";
  title: string;
  summary: string;
  category: string;
  region: Region;
  emoji: string;
  lifecycle: InitiativeLifecycle;
  temporalAnchor: TemporalAnchor;
  location: InitiativeLocation | null;

  // ── Layer B: Mission compatibility ──────────────────────────────────
  /** XP reward. Only present for sourceType === "mission". */
  xp?: number;
  /** Available spots. Only present for sourceType === "mission". */
  spotsLeft?: number;
  /** Difficulty label. Only present for sourceType === "mission". */
  difficulty?: string;
  /** Impact description. Only present for sourceType === "mission". */
  impact?: string;
  /** Organizer info. Only present for sourceType === "mission". */
  organizer?: { name: string; avatar: string } | null;
  /** Full description (summary is truncated). Only present for sourceType === "mission". */
  description?: string | null;
  /**
   * Raw start/end dates for legacy temporal computation.
   * Prefer temporalAnchor.label for display.
   */
  startDate?: string | null;
  endDate?: string | null;
};

/**
 * Builds an InitiativeMapEntity from an Initiative + optional Mission data.
 *
 * Pure function. No I/O.
 */
export function buildMapEntity(
  initiative: Initiative,
  missionCompat?: {
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
    // Layer A: always present
    id: initiative.id,
    sourceId: initiative.sourceId,
    sourceType: initiative.sourceType,
    title: initiative.title,
    summary: initiative.summary,
    category: initiative.category,
    region: initiative.region,
    emoji: initiative.emoji,
    lifecycle: initiative.lifecycle,
    temporalAnchor: initiative.temporalAnchor,
    location: initiative.location ?? null,

    // Layer B: present only for missions
    ...(missionCompat && {
      xp: missionCompat.xp,
      spotsLeft: missionCompat.spotsLeft,
      difficulty: missionCompat.difficulty,
      impact: missionCompat.impact,
      organizer: missionCompat.organizer,
      description: missionCompat.description,
      startDate: missionCompat.startDate,
      endDate: missionCompat.endDate,
    }),
  };
}
```

### Resolver for the map

A new lightweight resolver (separate from `initiativeResolver.ts`):

```ts
// src/services/mapEntityResolver.ts

import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import type { Mission } from "@/types";
import { initiativeResolver } from "./initiativeResolver";
import { buildMapEntity } from "@/domain/initiativeMapEntity";

export async function resolveMapEntities(): Promise<InitiativeMapEntity[]> {
  const initiatives = await initiativeResolver.resolveAll();
  const missions = await /* fetch missions with Layer B fields */;

  const missionMap = new Map(missions.map((m) => [m.id, m]));

  return initiatives.map((initiative) => {
    const mission = initiative.sourceType === "mission"
      ? missionMap.get(initiative.sourceId)
      : undefined;

    return buildMapEntity(initiative, mission ? {
      xp: mission.xp,
      spotsLeft: mission.spotsLeft,
      difficulty: mission.difficulty,
      impact: mission.impact,
      organizer: mission.organizer,
      description: mission.description,
      startDate: mission.startDate,
      endDate: mission.endDate,
    } : undefined);
  });
}
```

---

## 5. MapSelectionState Design

```ts
// src/features/map/types/index.ts (extend)

export type MapSelectionState = {
  /** Raw UUID of the selected entity (sourceId) */
  selectedId: string | null;
  /** Full entity data for rendering */
  selectedEntity: InitiativeMapEntity | null;
  /** Navigation breadcrumb trail */
  activeTerritoryPath: TerritoryNode[];
  /** Pin vs district heatmap mode */
  mapMode: "pins" | "districts";
  /** Mobile drawer open state */
  isDrawerOpen: boolean;
};
```

---

## 6. ID Normalization Strategy

### Problem

Three ID formats exist:

| Type | Example | Format |
|------|---------|--------|
| `Mission.id` | `"a1b2c3d4-e5f6-..."` | Raw UUID |
| `ProposalEntity.id` | `"b2c3d4e5-f6a7-..."` | Raw UUID |
| `Initiative.id` | `"mission_a1b2c3d4-e5f6-..."` | `{sourceType}_{uuid}` |
| `Initiative.sourceId` | `"a1b2c3d4-e5f6-..."` | Raw UUID |

### Strategy

| Surface | Use |
|---------|-----|
| Selection state | Raw UUID (`sourceId`) |
| Map marker key | Raw UUID (`sourceId`) |
| Popup link generation | Raw UUID + route determined by `sourceType` |
| MarkerMap ref | Raw UUID |
| Initiative feed list | Prefixed ID (since `Initiative.id` is the natural key) |
| Detail page routing | Raw UUID in route param (`/app/mision/$missionId`) |

### Normalization helpers

```ts
// src/domain/initiativeMapEntity.ts

/** Extracts the raw UUID from a prefixed Initiative.id */
export function parseSourceId(prefixedId: string): string {
  return prefixedId.replace(/^(mission|proposal)_/, "");
}

/** Builds the detail page route for an entity */
export function entityRoute(entity: {
  sourceType: string;
  sourceId: string;
}): { to: string; params: Record<string, string> } {
  if (entity.sourceType === "proposal") {
    return {
      to: "/app/propuesta/$proposalId",
      params: { proposalId: entity.sourceId },
    };
  }
  return {
    to: "/app/mision/$missionId",
    params: { missionId: entity.sourceId },
  };
}
```

---

## 7. Sidebar Strategy

**Recommendation: B — receive a specific projection (`InitiativeMapEntity`)**

The sidebar currently accesses Mission-only fields (`xp`, `spotsLeft`, `difficulty`, `impact`, `organizer`). With `InitiativeMapEntity`, these fields are optional and only present for mission-sourced entities.

### Migration behavior

| Entity sourceType | Sidebar behavior |
|------------------|-----------------|
| `"mission"` | Full detail: emoji, title, district, temporal anchor, XP, spots, difficulty, impact, organizer |
| `"proposal"` | Simplified detail: emoji, title, district, temporal anchor, support count |
| `"mission"` (no Layer B data) | Same as proposal — graceful degradation |

### Why not A or C

- **A (keep using Mission)**: Perpetuates dual data sources. Every surface must know about both types.
- **C (redesign)**: Out of scope — the sidebar design is not fundamentally flawed, only its data source.
- **B (projection)**: Single data type. Sidebar code only checks `sourceType` and optional fields. No branching on `entityType` vs `sourceType`.

---

## 8. Migration Phases

### Phase 0 — Foundation (Week 1)

| Step | Change | Files | Complexity |
|------|--------|-------|------------|
| 0.1 | Create `InitiativeMapEntity` type + `buildMapEntity()` | `src/domain/initiativeMapEntity.ts` (NEW) | Low |
| 0.2 | Create `parseSourceId()`, `entityRoute()` helpers | `src/domain/initiativeMapEntity.ts` | Low |
| 0.3 | Create `MapSelectionState` type | `src/features/map/types/index.ts` | Low |
| 0.4 | Create `resolveMapEntities()` in a new service | `src/services/mapEntityResolver.ts` (NEW) | Medium |

**Rollback:** Delete new files. No existing code is modified.

### Phase 1 — Marker Layer (Week 1-2)

| Step | Change | Files | Complexity |
|------|--------|-------|------------|
| 1.1 | Refactor `renderMissionMarkers` → `renderInitiativeMarkers` | `useMissionMarkerLayer.ts` | Medium |
| 1.2 | Accept `InitiativeMapEntity[]` instead of `Mission[]` | `useMissionMarkerLayer.ts` | Low |
| 1.3 | Use `entity.sourceType` instead of `proposalIds` Set | `useMissionMarkerLayer.ts` | Low |
| 1.4 | Use `entity.lifecycle` directly (already derived) | `useMissionMarkerLayer.ts` | Low |
| 1.5 | Use `entity.location.coords` instead of `mission.coords` | `useMissionMarkerLayer.ts` | Low |
| 1.6 | Update `MapView` to pass `InitiativeMapEntity[]` to marker layer | `MapView.tsx` | Low |

**Rollback:** Revert marker layer to use `Mission[]` + `proposalIds`. Keep Phase 0 files.

### Phase 2 — Selection State (Week 2)

| Step | Change | Files | Complexity |
|------|--------|-------|------------|
| 2.1 | Replace `selectedMissionId: string` with `MapSelectionState` | `MapView.tsx`, `app.mapa.tsx` | Medium |
| 2.2 | Normalize ID handling — use `sourceId` for selection | Both map files | Low |
| 2.3 | Update `selectedMissionId` prop → `selectedEntityId` | `MapView.tsx` props | Medium |
| 2.4 | Update click handlers to use `sourceId` | `useMissionMarkerLayer.ts` | Low |

**Rollback:** Revert to `selectedMissionId: string | null` prop.

### Phase 3 — Sidebar + Drawer (Week 3)

| Step | Change | Files | Complexity |
|------|--------|-------|------------|
| 3.1 | Replace `sidebarMissions.filter(m => entityType !== "proposal")` with `entities.filter(e => sourceType === "mission")` | `app.mapa.tsx` | Low |
| 3.2 | Replace `activeMission` (CivicEntity) with `selectedEntity` (InitiativeMapEntity) | `app.mapa.tsx` | High |
| 3.3 | Update all field access paths (`.xp` → `.xp` still works; `.participants` → `.participantsCount`) | `app.mapa.tsx` | Medium |
| 3.4 | Update drawer `computeMissionAnchor()` call → use `entity.temporalAnchor.label` directly | `app.mapa.tsx` | Low |
| 3.5 | Remove `entityType` discriminator — use `sourceType` | `app.mapa.tsx`, `MapView.tsx` | Medium |
| 3.6 | Update filter hooks (`useMissionMapFilters`) to accept `InitiativeMapEntity[]` | `useMissionMapFilters.ts` | Medium |

**Rollback:** Complex — requires reverting all Phase 3 changes. Alternative: keep a `activeMission` compatibility getter.

### Phase 4 — Cleanup (Week 4)

| Step | Change | Files | Complexity |
|------|--------|-------|------------|
| 4.1 | Remove `proposalIds` parameter from marker layer | `useMissionMarkerLayer.ts` | Low |
| 4.2 | Remove `as any` cast in `allMapItems` | `app.mapa.tsx` | Low |
| 4.3 | Remove `entityType` from CivicEntity (future type cleanup) | `entity.ts` | Low |
| 4.4 | Enable `VITE_USE_INITIATIVE_READ_MODEL` by default | `.env` | Low |

**Rollback:** Re-enable the flag. Revert type cleanup. The old code paths still compile.

---

## 9. Affected Files (Complete)

| # | File | Phase | Lines | Change Complexity |
|---|------|-------|-------|-------------------|
| 1 | `src/domain/initiativeMapEntity.ts` | 0 | ~80 (NEW) | Low |
| 2 | `src/services/mapEntityResolver.ts` | 0 | ~40 (NEW) | Medium |
| 3 | `src/features/map/types/index.ts` | 0 | +15 | Low |
| 4 | `src/features/map/layers/useMissionMarkerLayer.ts` | 1 | 50% of file | Medium |
| 5 | `src/features/map/components/MapView.tsx` | 1,2,3 | ~60 lines | High |
| 6 | `src/routes/app.mapa.tsx` | 2,3 | ~80 lines | High |
| 7 | `src/features/map/hooks/useMissionMapFilters.ts` | 3 | ~40 lines | Medium |
| 8 | `src/features/map/layers/useDistrictLayer.ts` | 3 | ~5 lines | Low |
| 9 | `src/types/entity.ts` | 4 | ~10 lines | Low |

---

## 10. Complexity Assessment

| Phase | Effort | Risk | Parallelizable |
|-------|--------|------|---------------|
| 0: Foundation | 2-3h | None | Yes |
| 1: Marker Layer | 4-6h | Low | No (depends on Phase 0) |
| 2: Selection State | 3-4h | Low | No (depends on Phase 1) |
| 3: Sidebar + Drawer | 8-12h | Medium | No (depends on Phase 2) |
| 4: Cleanup | 2-3h | Low | No (depends on Phase 3) |

**Total:** 19-28h across 4 weeks.

---

## 11. Risks

| Risk | Phase | Impact | Mitigation |
|------|-------|--------|------------|
| `InitiativeMapEntity` diverges from actual `Initiative` shape | 0 | Low | Always derive from `Initiative` + `Mission` separately; never duplicate fields destructively |
| Route linking breaks due to ID format change | 2 | High | Normalize to `sourceId` (raw UUID) for route params; keep `Initiative.id` (prefixed) only for display |
| Sidebar shows `undefined`/`NaN` for Mission-only fields | 3 | High | TypeScript strict checks; runtime fallbacks (`xp ?? 0`, `spotsLeft ?? "—"`) |
| Filter hooks break because `difficulty` is missing from proposals | 3 | Medium | Filtering by difficulty already guarded by `isMission()`; update guard to check `sourceType === "mission"` |
| `as any` cast hides type errors | Current | High | Remove in Phase 4, but add runtime validation in Phase 0 |

---

## 12. Rollback Strategy

| Phase | Rollback Method |
|-------|----------------|
| 0 | Delete new files. No existing code touched. |
| 1 | Revert marker layer to accept `Mission[]` + `proposalIds`. Keep Phase 0 files. |
| 2 | Revert `MapSelectionState` → `selectedMissionId: string \| null`. |
| 3 | Revert all field access paths. Keep `InitiativeMapEntity` but don't use for sidebar. |
| 4 | Re-enable `VITE_USE_INITIATIVE_READ_MODEL=false`. |

Each phase is additive and independently revertible. No phase modifies the Initiative resolver or domain models.

---

## 13. Migration Diagram (State Machine)

```
                         ┌─────────────────────┐
                         │  Current: as any     │
                         │  CivicEntity union   │
                         └──────────┬──────────┘
                                    │
                         Phase 0    │ (foundation, no behavior change)
                                    ▼
                         ┌─────────────────────┐
                         │  InitiativeMapEntity │
                         │  built alongside     │
                         └──────────┬──────────┘
                                    │
                         Phase 1    │ (marker layer switch)
                                    ▼
                         ┌─────────────────────┐
                         │  Markers render from │
                         │  InitiativeMapEntity │
                         │  Missions still used │
                         │  for sidebar+drawer  │
                         └──────────┬──────────┘
                                    │
                         Phase 2    │ (selection state)
                                    ▼
                         ┌─────────────────────┐
                         │  Unified selection  │
                         │  Normalized IDs     │
                         └──────────┬──────────┘
                                    │
                         Phase 3    │ (sidebar + drawer)
                                    ▼
                         ┌─────────────────────┐
                         │  All map surfaces   │
                         │  use InitiativeMap  │
                         │  Layer B graceful   │
                         └──────────┬──────────┘
                                    │
                         Phase 4    │ (cleanup)
                                    ▼
                         ┌─────────────────────┐
                         │  Initiative read     │
                         │  model enabled by    │
                         │  default             │
                         │  No as any           │
                         └─────────────────────┘
```

---

## 14. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Projection over union** | `InitiativeMapEntity` is a derived type, not a DB table. No migration, no backfill, no schema change. |
| **Separate resolver** | `mapEntityResolver.ts` is distinct from `initiativeResolver.ts`. Keeps the Initiative resolver pure (read-only, no Mission field knowledge). |
| **Raw UUID for routing** | Routes are `/app/mision/$id` and `/app/propuesta/$id`. Using `sourceId` keeps URLs stable regardless of data source. |
| **Layer B optional** | The sidebar gracefully degrades when Layer B fields are absent (proposals, or future non-mission initiatives). |
| **No entityType** | `sourceType` replaces `entityType` everywhere. The old `entityType` discriminator on CivicEntity is removed in Phase 4. |
| **`as any` elimination** | The current `as any` cast is the single worst type-safety gap. Phase 4 removes it entirely — the entire map is type-safe against `InitiativeMapEntity`. |

---

## 15. Success Criteria

| Criterion | How to verify |
|-----------|---------------|
| Marker layer uses Initiative lifecycle directly | No `deriveLifecycleFromMission` call in marker layer |
| No `entityType` references in map surface | grep for `entityType` in `src/features/map/` and `src/routes/app.mapa.tsx` returns 0 |
| No `as any` in map surface | grep returns 0 |
| Sidebar shows XP for missions, hides for proposals | Visual check with a proposal selected |
| Routes use `sourceId` (raw UUID) | Route params are never prefixed |
| `VITE_USE_INITIATIVE_READ_MODEL` can be set to `true` | Full map functionality without errors |
