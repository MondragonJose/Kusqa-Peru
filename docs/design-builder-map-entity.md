# Design: `buildMapEntity()` — Technical Specification

**Status:** Design · No implementation  
**Date:** 2026-06-10  

---

## 1. Signature

```ts
// Single entry point, three overloads — discriminated at runtime by shape.
// All domain-level derivations are imported from existing pure modules.
// No I/O, no repositories, no React, no side effects.

export function buildMapEntity(input: {
  type: "mission";
  mission: Mission;
  supportCount?: number;
}): InitiativeMapEntity;

export function buildMapEntity(input: {
  type: "proposal";
  proposal: Proposal;
  supportCount?: number;
}): InitiativeMapEntity;

export function buildMapEntity(input: {
  type: "initiative";
  initiative: Initiative;
  missionCompat?: MissionCompat;
}): InitiativeMapEntity;

// Runtime implementation (single function, discriminated by input.type)
export function buildMapEntity(
  input: MissionInput | ProposalInput | InitiativeInput,
): InitiativeMapEntity;
```

### Why discriminated union over overloads?

| Approach | Problem |
|----------|---------|
| `buildMapEntity(mission: Mission)` | TS can't distinguish `Mission` from `Proposal` — both have `id`, `title`, `district`, `region` |
| `buildMapEntity(source: Mission \| Proposal)` | Implementation must use duck-typing or `in` checks — fragile |
| `buildMapEntity(input: { type: ... })` | **Explicit, type-safe.** Narrowing by `input.type` is exhaustively checked by the compiler. |

### Supporting types

```ts
type MissionInput = {
  type: "mission";
  mission: Mission;
  /** Optional pre-fetched support count for territorial enrichment. */
  supportCount?: number;
};

type ProposalInput = {
  type: "proposal";
  proposal: Proposal;
  /** Optional pre-fetched support count. If omitted, default 0 is used. */
  supportCount?: number;
};

type InitiativeInput = {
  type: "initiative";
  initiative: Initiative;
  /**
   * Optional Mission data for Layer B fields (xp, spotsLeft, etc.).
   * Only meaningful when initiative.sourceType === "mission".
   * Ignored silently for proposals.
   */
  missionCompat?: MissionCompat;
};

/**
 * Layer B fields that exist only on Mission records.
 * These are passed separately because the Initiative read model
 * doesn't carry them. The caller (resolver) fetches them from
 * missionRepository alongside initiativeResolver.
 */
export type MissionCompat = {
  xp: number;
  spotsLeft: number;
  difficulty: MissionDifficulty;
  impact: string;
  organizer: { name: string; avatar: string } | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
};
```

---

## 2. Mapping Tables

### 2.1 Mission → InitiativeMapEntity

| IME field | Source | Derivation | Risk |
|-----------|--------|------------|------|
| `id` | `mission.id` | Direct | None |
| `prefixedId` | `mission.id` | `"mission_" + mission.id` | None |
| `sourceType` | literal | `"mission"` | None |
| `title` | `mission.title` | Direct | None |
| `summary` | `mission.description` | Direct (IMO uses `summary` as the canonical field; `description` is the Mission name for it) | Low — semantic rename only |
| `category` | `mission.category` | Direct | None |
| `region` | `mission.region` | Direct | None |
| `emoji` | `mission.emoji` | Direct | None |
| **`lifecycle`** | `mission.lifecycleInfo.lifecycle` | `deriveLifecycleFromMission(mission.lifecycleInfo.lifecycle)` | None |
| **`temporalAnchor`** | `mission.lifecycleInfo`, `mission.startDate`, `mission.endDate` | `computeMissionAnchor(mission.lifecycleInfo, mission.startDate, mission.endDate)` | None |
| `participantsCount` | `mission.participants` | Direct | None |
| **`supportersCount`** | — | `input.supportCount ?? 0` | **Risk: Missions don't have supporters.** Default 0. Enricher must backfill. |
| **`vitalityScore`** | — | `undefined` (set by enricher) | None |
| **`lastActivityAt`** | `mission.date` | Direct | None |
| `location.district` | `mission.district` | Direct | None |
| `location.districtId` | `mission.districtId ?? null` | Direct | None |
| `location.region` | `mission.region` | Direct | None |
| `location.coords` | `mission.coords` | Direct | None |
| `xp` | `mission.xp` | Direct | None |
| `spotsLeft` | `mission.spotsLeft` | Direct | None |
| `difficulty` | `mission.difficulty` | Direct | None |
| `impact` | `mission.impact` | Direct | None |
| `organizer` | `mission.organizer` | Direct | None |
| `description` | `mission.description` | Direct | None |
| `startDate` | `mission.startDate` | Direct | None |
| `endDate` | `mission.endDate` | Direct | None |

**Total:** 26 fields, 22 direct, 4 derived. **Zero impossible fields.** All Layer B fields available.

### 2.2 Proposal → InitiativeMapEntity

| IME field | Source | Derivation | Risk |
|-----------|--------|------------|------|
| `id` | `proposal.id` | Direct | None |
| `prefixedId` | `proposal.id` | `"proposal_" + proposal.id` | None |
| `sourceType` | literal | `"proposal"` | None |
| `title` | `proposal.title` | Direct | None |
| **`summary`** | `proposal.summary ?? proposal.description ?? proposal.title` | **Fallback chain** — summary → description → title | Low — summary may be null |
| `category` | `proposal.category` | Direct | None |
| `region` | `proposal.region` | Direct | None |
| **`emoji`** | `proposal.category` | `categoryEmoji(proposal.category as MissionCategory)` | None — same pattern used by `initiativeResolver.ts` and `entityAdapter.ts` |
| **`lifecycle`** | `proposal.status`, `proposal.convertedAt`, `proposal.completedAt` | `deriveLifecycleFromProposal(proposal.status, proposal.convertedAt, proposal.completedAt)` | None |
| **`temporalAnchor`** | `proposal.status`, timestamps, `supportCount`, `teamSize` | `computeProposalAnchor(status, proposedDate, createdAt, convertedAt, completedAt, supportCount, getProposalThreshold(teamSize))` | **Risk: needs supportCount + threshold** — must come from caller or default to 0+threshold |
| `participantsCount` | — | `0` (proposals have no participants) | Intrinsic |
| **`supportersCount`** | `input.supportCount ?? 0` | Optional enrichment | None |
| `vitalityScore` | — | `undefined` (set by enricher) | None |
| **`lastActivityAt`** | `proposal.createdAt` | Direct | None |
| `location.district` | `proposal.district` | Direct | None |
| `location.districtId` | `proposal.districtId ?? null` | Direct | None |
| `location.region` | `proposal.region` | Direct | None |
| **`location.coords`** | `proposal.latitude`, `proposal.longitude` | `(latitude !== null && longitude !== null) ? { lat: Number(latitude), lng: Number(longitude) } : null` | Low — lat/lng may be null strings |
| `xp` | — | `undefined` | Intrinsic |
| `spotsLeft` | — | `undefined` | Intrinsic |
| `difficulty` | — | `undefined` | Intrinsic |
| `impact` | — | `undefined` | Intrinsic |
| `organizer` | — | `undefined` | Intrinsic |
| `description` | — | `undefined` | Intrinsic (use `summary` for display) |
| `startDate` | — | `undefined` | Intrinsic |
| `endDate` | — | `undefined` | Intrinsic |

**Impossible fields:** 8 Layer B fields intrinsically unavailable. **Not a bug** — proposals have no XP, difficulty, impact, or organizer.

**Risks:**
1. `temporalAnchor` needs `supportCount` + `threshold`. The caller must compute these. If omitted, anchor defaults to "Buscando personas para empezar" (`supportCount=0`).
2. `summary` fallback chain may produce title in worst case — acceptable for a map preview.
3. `location.coords` requires string→number coercion (`Number(latitude)`). The resolver already does this.

### 2.3 Initiative → InitiativeMapEntity

| IME field | Source | Derivation | Risk |
|-----------|--------|------------|------|
| `id` | `initiative.sourceId` | Direct | None |
| `prefixedId` | `initiative.id` | Direct | None |
| `sourceType` | `initiative.sourceType` | Direct | None |
| `title` | `initiative.title` | Direct | None |
| `summary` | `initiative.summary` | Direct | None |
| `category` | `initiative.category` | Direct | None |
| `region` | `initiative.region` | Direct | None |
| `emoji` | `initiative.emoji` | Direct | None |
| `lifecycle` | `initiative.lifecycle` | Direct | None |
| `temporalAnchor` | `initiative.temporalAnchor` | Direct | None |
| `participantsCount` | `initiative.participantsCount ?? 0` | Direct + default | None |
| `supportersCount` | `initiative.supportersCount ?? 0` | Direct + default | None |
| `vitalityScore` | `initiative.vitalityScore` | Direct | None |
| **`lastActivityAt`** | — | **GAP: Initiative has no `lastActivityAt`** | **Need to add to Initiative type** |
| `location.district` | `initiative.location?.district` | Direct | None |
| `location.districtId` | `initiative.location?.districtId ?? null` | Direct | None |
| `location.region` | `initiative.location?.region ?? initiative.region` | **Fallback to `initiative.region`** | Low — location may be undefined |
| `location.coords` | `initiative.location?.coords ?? null` | Direct | None |
| `xp` | `input.missionCompat?.xp` | Optional | Only present with missionCompat |
| `spotsLeft` | `input.missionCompat?.spotsLeft` | Optional | Same |
| `difficulty` | `input.missionCompat?.difficulty` | Optional | Same |
| `impact` | `input.missionCompat?.impact` | Optional | Same |
| `organizer` | `input.missionCompat?.organizer` | Optional | Same |
| `description` | `input.missionCompat?.description` | Optional | Same |
| `startDate` | `input.missionCompat?.startDate` | Optional | Same |
| `endDate` | `input.missionCompat?.endDate` | Optional | Same |

**Gap:** `lastActivityAt` must be added to the `Initiative` domain type. Currently:
```ts
export type Initiative = {
  // ... existing fields
  vitalityScore?: number;
  // MISSING: lastActivityAt: string;
};
```

**Fix:** Add `lastActivityAt: string` to `Initiative`. The resolver populates it from `mission.date` or `proposal.createdAt`.

---

## 3. Helpers

```ts
// src/domain/initiativeMapEntity.ts

import type { Region } from "./regions";
import type { MissionCategory, MissionDifficulty } from "@/types";

/**
 * Route link for an InitiativeMapEntity.
 * Every spatial entity maps to exactly one detail page.
 */
export function entityRoute(entity: {
  sourceType: "mission" | "proposal";
  id: string;
}): { to: string; params: Record<string, string> } {
  if (entity.sourceType === "proposal") {
    return {
      to: "/app/propuesta/$proposalId",
      params: { proposalId: entity.id },
    };
  }
  return {
    to: "/app/mision/$missionId",
    params: { missionId: entity.id },
  };
}

/**
 * Safe accessor for Layer B fields.
 * Returns the fallback when the field is absent (proposal).
 */
export function getXp(entity: { xp?: number }): number {
  return entity.xp ?? 0;
}
export function getSpotsLeft(entity: { spotsLeft?: number }): number | "—" {
  return entity.spotsLeft ?? "—";
}
export function getDifficulty(entity: { difficulty?: string }): string {
  return entity.difficulty ?? "—";
}
export function getImpact(entity: { impact?: string }): string {
  return entity.impact ?? "";
}
export function getOrganizerName(entity: { organizer?: { name: string } | null }): string | null {
  return entity.organizer?.name ?? null;
}
```

---

## 4. Invariants (must hold after every call)

```ts
// src/domain/__tests__/initiativeMapEntity.invariants.test.ts

invariant("id is always a raw UUID, never prefixed"):
  entity.id === input.initiative.sourceId  (for initiative input)
  entity.id === input.mission.id           (for mission input)
  entity.id === input.proposal.id          (for proposal input)

invariant("prefixedId always has sourceType prefix"):
  entity.prefixedId.startsWith(entity.sourceType + "_")

invariant("sourceType is never undefined"):
  entity.sourceType === "mission" || entity.sourceType === "proposal"

invariant("title is never empty"):
  entity.title.length > 0

invariant("lifecycle is a valid InitiativeLifecycle"):
  ["forming", "active", "ending", "completed", "archived"].includes(entity.lifecycle)

invariant("temporalAnchor is never null"):
  entity.temporalAnchor !== null
  entity.temporalAnchor.label.length > 0

invariant("location.coords is null for coord-less entities, never undefined"):
  entity.location === null || entity.location.coords === null || isValidLatLng(entity.location.coords)

invariant("Layer B fields are undefined for proposals"):
  if (entity.sourceType === "proposal") {
    assert(entity.xp === undefined)
    assert(entity.spotsLeft === undefined)
    assert(entity.difficulty === undefined)
    assert(entity.impact === undefined)
    assert(entity.organizer === undefined)
    assert(entity.description === undefined)
    assert(entity.startDate === undefined)
    assert(entity.endDate === undefined)
  }

invariant("Layer B fields are present for missions with missionCompat"):
  if (entity.sourceType === "mission" && missionCompat) {
    assert(entity.xp !== undefined)
    assert(entity.spotsLeft !== undefined)
  }

invariant("participantsCount is always a number >= 0"):
  typeof entity.participantsCount === "number" && entity.participantsCount >= 0

invariant("supportersCount is always a number >= 0"):
  typeof entity.supportersCount === "number" && entity.supportersCount >= 0

invariant("lastActivityAt is a non-empty ISO string"):
  typeof entity.lastActivityAt === "string" && entity.lastActivityAt.length > 0
```

---

## 5. Test Cases

### 5.1 Standard Mission

```ts
// Input: Mission with all fields populated
const mission = {
  id: "abc-123",
  title: "Limpieza del río",
  description: "Una jornada de limpieza comunitaria",
  district: "Iquitos",
  region: "selva" as Region,
  category: "Medio ambiente" as MissionCategory,
  xp: 540,
  participants: 12,
  spotsLeft: 8,
  date: "2026-06-10T10:00:00Z",
  difficulty: "media" as MissionDifficulty,
  impact: "Recuperar 2km de ribera",
  organizer: { name: "Camila", avatar: "🌸" },
  coords: { lat: -3.74912, lng: -73.25383 },
  emoji: "🛶",
  startDate: "2026-06-15T10:00:00Z",
  endDate: "2026-06-20T18:00:00Z",
  lifecycleInfo: {
    lifecycle: "active",
    isJoinable: true,
    isCompletable: true,
    isVisible: true,
    lifecyclePriority: 2,
    timeToEnd: 864000000,
    timeToEndLabel: "10d",
    timeToStart: null,
    timeToStartLabel: null,
  },
} satisfies Mission;

const entity = buildMapEntity({ type: "mission", mission });

entity.id           // "abc-123"
entity.prefixedId   // "mission_abc-123"
entity.sourceType   // "mission"
entity.lifecycle    // "active"
entity.temporalAnchor.label  // "En curso"
entity.participantsCount    // 12
entity.supportersCount      // 0
entity.xp                   // 540
entity.spotsLeft            // 8
entity.difficulty           // "media"
entity.impact               // "Recuperar 2km de ribera"
entity.organizer?.name      // "Camila"
entity.lastActivityAt       // "2026-06-10T10:00:00Z"
```

### 5.2 Standard Proposal

```ts
const proposal = {
  id: "def-456",
  title: "Huerto comunitario",
  description: "Crear un huerto en el centro del distrito",
  summary: "Huerto comunitario en el centro",
  category: "Medio ambiente",
  district: "Chinchero",
  region: "sierra" as Region,
  teamSize: 15,
  status: "pending" as ProposalStatus,
  latitude: "-13.3911",
  longitude: "-72.0475",
  createdAt: "2026-06-08T14:30:00Z",
  proposedDate: "2026-06-08T14:30:00Z",
  convertedAt: null,
  completedAt: null,
  districtId: "dist-01",
  locationLabel: null,
  // ... other fields
} satisfies Proposal;

const entity = buildMapEntity({ type: "proposal", proposal });

entity.id             // "def-456"
entity.prefixedId     // "proposal_def-456"
entity.sourceType     // "proposal"
entity.lifecycle      // "forming"
entity.temporalAnchor.label  // "Recién propuesta"
entity.participantsCount    // 0
entity.supportersCount      // 0
entity.summary              // "Huerto comunitario en el centro"
entity.emoji                // "🌱" (from categoryEmoji("Medio ambiente"))
entity.xp                   // undefined
entity.spotsLeft            // undefined
entity.difficulty           // undefined
entity.impact               // undefined
entity.organizer            // undefined
entity.description          // undefined
entity.location.coords      // { lat: -13.3911, lng: -72.0475 }
entity.location.district    // "Chinchero"
```

### 5.3 Proposal without coordinates

```ts
const proposalNoCoords = {
  ...proposal,
  latitude: null,
  longitude: null,
};

const entity = buildMapEntity({ type: "proposal", proposal: proposalNoCoords });

entity.location.coords  // null
```

### 5.4 Initiative with missionCompat

```ts
const initiative = {
  id: "mission_abc-123",
  sourceType: "mission",
  sourceId: "abc-123",
  title: "Limpieza del río",
  summary: "Una jornada de limpieza comunitaria",
  category: "Medio ambiente" as MissionCategory,
  region: "selva" as Region,
  lifecycle: "active",
  participantsCount: 12,
  supportersCount: 0,
  temporalAnchor: { label: "En curso", kind: "active", referenceDate: null },
  emoji: "🛶",
  location: {
    district: "Iquitos",
    districtId: null,
    region: "selva" as Region,
    coords: { lat: -3.74912, lng: -73.25383 },
    locationLabel: null,
  },
} satisfies Initiative;

const compat: MissionCompat = {
  xp: 540,
  spotsLeft: 8,
  difficulty: "media",
  impact: "Recuperar 2km de ribera",
  organizer: { name: "Camila", avatar: "🌸" },
  description: "Una jornada de limpieza comunitaria",
  startDate: "2026-06-15T10:00:00Z",
  endDate: "2026-06-20T18:00:00Z",
};

const entity = buildMapEntity({ type: "initiative", initiative, missionCompat: compat });

entity.id           // "abc-123" (sourceId)
entity.prefixedId   // "mission_abc-123" (initiative.id)
entity.sourceType   // "mission"
entity.xp           // 540 (from missionCompat)
entity.xp === undefined  // false
entity.organizer?.name   // "Camila"
```

### 5.5 Initiative without missionCompat (proposal source)

```ts
const proposalInitiative = {
  id: "proposal_def-456",
  sourceType: "proposal",
  sourceId: "def-456",
  title: "Huerto comunitario",
  summary: "Huerto comunitario en el centro",
  category: "Medio ambiente" as MissionCategory,
  region: "sierra" as Region,
  lifecycle: "forming",
  participantsCount: 0,
  supportersCount: 5,
  temporalAnchor: { label: "Recién propuesta", kind: "recent", referenceDate: "2026-06-08T14:30:00Z" },
  emoji: "🌱",
  location: {
    district: "Chinchero",
    districtId: "dist-01",
    region: "sierra" as Region,
    coords: { lat: -13.3911, lng: -72.0475 },
    locationLabel: null,
  },
} satisfies Initiative;

const entity = buildMapEntity({ type: "initiative", initiative: proposalInitiative });

entity.xp       // undefined
entity.spotsLeft  // undefined
entity.difficulty // undefined
entity.impact     // undefined
entity.organizer  // undefined
```

### 5.6 Initiative — missionCompat ignored for proposals

```ts
// When building from an Initiative with sourceType === "proposal",
// even if missionCompat is provided, Layer B fields should NOT be set.
const entity = buildMapEntity({
  type: "initiative",
  initiative: proposalInitiative,
  missionCompat: { /* ...any compat data... */ },
});

entity.xp  // undefined (missionCompat is silently ignored for proposals)
invariant("missionCompat is ignored for proposals")
```

### 5.7 Edge: Mission with empty description

```ts
const missionNoDesc = { ...mission, description: "" };
const entity = buildMapEntity({ type: "mission", mission: missionNoDesc });

entity.summary  // ""
entity.description  // "" (Layer B preserves original)
```

### 5.8 Edge: Proposal with null summary and null description

```ts
const proposalMinimal = { ...proposal, summary: null, description: null };
const entity = buildMapEntity({ type: "proposal", proposal: proposalMinimal });

entity.summary  // proposal.title (fallback chain: summary → description → title)
```

### 5.9 Edge: Initiative with no location

```ts
const initiativeNoLoc = { ...initiative, location: undefined };
const entity = buildMapEntity({ type: "initiative", initiative: initiativeNoLoc });

entity.location          // null
entity.location.coords   // would error — use optional chaining
invariant("location may be null; consumers must guard")
```

### 5.10 Lifecycle coverage (all 5 states) — Mission

```ts
const lifecycles: Array<{ lifecycle: MissionLifecycle; expected: InitiativeLifecycle }> = [
  { lifecycle: "upcoming",     expected: "forming" },
  { lifecycle: "active",       expected: "active" },
  { lifecycle: "ending_soon",  expected: "ending" },
  { lifecycle: "completed",    expected: "completed" },
  { lifecycle: "archived",     expected: "archived" },
];

for (const { lifecycle, expected } of lifecycles) {
  const m = { ...mission, lifecycleInfo: { ...mission.lifecycleInfo, lifecycle } };
  const entity = buildMapEntity({ type: "mission", mission: m });
  assert(entity.lifecycle === expected);
}
```

### 5.11 Lifecycle coverage (all states) — Proposal

```ts
// These are tested by deriveLifecycleFromProposal. The coverage is:
// pending → forming
// active (no completedAt, no convertedAt) → active
// active (with completedAt) → completed
// active (with convertedAt, no completedAt) → active
// resolved → completed
// rejected → archived
```

### 5.12 Route helper

```ts
const missionEntity = buildMapEntity({ type: "mission", mission });
entityRoute(missionEntity)
// → { to: "/app/mision/$missionId", params: { missionId: "abc-123" } }

const proposalEntity = buildMapEntity({ type: "proposal", proposal });
entityRoute(proposalEntity)
// → { to: "/app/propuesta/$proposalId", params: { proposalId: "def-456" } }
```

---

## 6. Semantics: Visual State, Badges, CTAs

These are NOT part of `buildMapEntity()`. They are derived by separate pure functions:

| Concern | Function | File |
|---------|----------|------|
| Marker visual class, opacity, animation | `getLifecyclePresentation(lifecycle)` | `lifecyclePresentation.ts` |
| CTA label in popup | `getLifecyclePresentation(lifecycle).ctaLabel` | `lifecyclePresentation.ts` |
| Badge emoji overlay | `getLifecyclePresentation(lifecycle).badge` | `lifecyclePresentation.ts` |
| Tooltip tone in popup | `getLifecyclePresentation(lifecycle).tooltipTone` | `lifecyclePresentation.ts` |
| Available action set | `getAvailableInitiativeActions(context)` | `initiativeActions.ts` |
| Action label | `actionToLabel(action, lifecycle, sourceType)` | `initiativeActions.ts` |

`buildMapEntity()` provides the identity (`sourceType`, `lifecycle`) that these functions consume. It does NOT pull visual presentation into the entity.

**Why separate?** The entity is data; presentation is context-dependent. The same entity needs different CTAs in a popup vs a sidebar vs a card. Baking `ctaLabel` into the entity would couple it to a specific rendering context.

---

## 7. Risk: Semantic Loss Analysis

| Scenario | Loss | Acceptable? |
|----------|------|-------------|
| Mission → IME | `distanceKm` dropped | **Yes** — never rendered on map |
| Mission → IME | `status` dropped (superseded by `lifecycle`) | **Yes** |
| Mission → IME | `lifecycleInfo` expanded to isJoinable/isCompletable/etc. | **Partial** — these flags are derivable from `lifecycle` but are not currently in `InitiativeLifecycle`. Consumers that check `isJoinable` must switch to `lifecycle === "forming" \|\| lifecycle === "active"` |
| Proposal → IME | `teamSize` dropped | **Yes** — only used for spotsLeft on ProposalEntity; IME uses `spotsLeft` undefined for proposals |
| Proposal → IME | `summary` → `summary` preserved | **None** |
| Proposal → IME | `images` dropped | **Yes** — map doesn't render images |
| Proposal → IME | `why` dropped | **Yes** — map doesn't render author voice |
| Initiative → IME | `sourceId` → `id` | **None** — rename only |
| Initiative → IME | `location?.locationLabel` dropped | **Yes** — not used by any map surface |
| All → IME | `isJoinable` flag lost | **Low** — derives from `lifecycle === "forming" \|\| lifecycle === "active"` |
| All → IME | `isVisible` flag lost | **None** — `lifecycle === "archived"` is the only hidden state, already present |

### Maximum semantic loss: **Low**

Every field consumed by the map (17 Mission fields, 9 Proposal fields) maps to the IME contract. Only 3 fields are dropped (`distanceKm`, `status`, `images`), none used by the map.

The `isJoinable`/`isCompletable` lifecycle flags are the only derivable information lost. Consumers must switch to lifecycle-based checks:

```ts
// Before (CivicEntity)
if (mission.lifecycleInfo.isJoinable) { ... }

// After (InitiativeMapEntity)  
if (entity.lifecycle === "forming" || entity.lifecycle === "active") { ... }
```

---

## 8. Required Changes to Adjacent Modules

| Module | Change | Reason |
|--------|--------|--------|
| `src/domain/initiative.ts` | Add `lastActivityAt: string` to `Initiative` type | Needed for ambient signal and vitality |
| `src/services/initiativeResolver.ts` | Populate `lastActivityAt` from `mission.date` / `proposal.createdAt` | Enrichment |
| `src/types/entity.ts` | No change (CivicEntity stays for PublicMissionCard) | Backward compat |
| `src/services/entityAdapter.ts` | No change | Legacy adapter stays for non-map surfaces |

---

## 9. Implementation Order

| Step | File | Effort |
|------|------|--------|
| 1. Add `lastActivityAt` to `Initiative` | `src/domain/initiative.ts` | 2 min |
| 2. Populate `lastActivityAt` in resolver | `src/services/initiativeResolver.ts` | 5 min |
| 3. Create `InitiativeMapEntity` type | `src/domain/initiativeMapEntity.ts` | 15 min |
| 4. Create `MissionCompat` type | Same file | 2 min |
| 5. Create `buildMapEntity()` with 3-input discriminated union | Same file | 30 min |
| 6. Create `entityRoute()` helper | Same file | 5 min |
| 7. Create safe accessors (`getXp`, `getSpotsLeft`, etc.) | Same file | 5 min |
| 8. Write invariant tests | `src/domain/__tests__/initiativeMapEntity.test.ts` | 30 min |
| **Total** | | **~1.5h** |
