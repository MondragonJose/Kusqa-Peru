# KUSQA Architecture Guide

## System Overview

KUSQA is a civic-territorial coordination platform for Peruvian youth. It connects community-driven projects (expeditions) with participants through a spatial, event-driven architecture.

### Core Principles

- **Territorial** — all activity is geographically grounded (districts, regions, coordinates)
- **Civic** — the platform amplifies community initiative, not social-media mechanics
- **Event-sourced** — domain events are the atomic unit of state change
- **RLS-isolated** — Supabase Row-Level Security is the authority barrier
- **Calm** — no gamification loops, no surveillance, no institutional friction

---

## Layer Architecture

```
Routes (src/routes/)
    │
    ▼
Features (src/features/*/)
    │   hooks, components, constants
    ▼
Hooks (src/hooks/)  ◄── Orchestration hooks
    │   useEventPropagation, useMissionRealtimeSync
    ▼
Services (src/services/)
    │   repositories, adapters, business logic
    ▼
Domain (src/domain/)
    │   pure computation, events, spatial, narratives
    ▼
Infrastructure (src/lib/)
    │   supabase client, telemetry, realtime bridge
```

### Layer Rules

| Layer       | Can import from                   | Cannot import from                              |
| ----------- | --------------------------------- | ----------------------------------------------- |
| `routes/`   | features, hooks, services, domain | —                                               |
| `features/` | hooks, services, domain, lib      | other features/\*                               |
| `hooks/`    | services, domain, lib             | features, routes                                |
| `services/` | domain, lib                       | features, hooks, routes                         |
| `domain/`   | (nothing — pure computation)      | services, features, hooks, routes, lib/supabase |
| `lib/`      | (nothing — infrastructure)        | domain, services, features                      |

### Exceptions (known, documented)

1. `domain/territorialEvent.ts` imports `KusqaDomainEvent` from `domain/events` (same layer ✓)
2. `eventEmitter.ts` (domain) calls `appendEventToStore` (services) — domain emits; services persist
3. `features/auth/useCurrentUser.ts` imports from `features/progression/` — cross-feature dependency, scheduled for extraction

---

## Domain Layer

### `src/domain/`

Pure computation, no side effects, no Supabase, no React.

| Subsystem                | Files                                                                                                                                        | Responsibility                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Events**               | `events.ts`, `eventCausality.ts`, `eventEmitter.ts`, `eventIntegrity.ts`, `eventReducer.ts`, `eventRegistry.ts`, `eventStore.ts` (pure only) | Domain event types, causal chains, subscription bus, reduction, replay           |
| **Spatial**              | `territorial.ts`                                                                                                                             | Haversine distance, region inference from coordinates, SVG projection            |
| **Spatial Intelligence** | `spatialRelationships.ts`, `territorialIntelligence.ts`, `territoryAggregations.ts`                                                          | Adjacency, contiguity, vitality classification, civic memory, movement direction |
| **Territorial Event**    | `territorialEvent.ts`                                                                                                                        | TerritorialEvent aggregate, event copy, adapter from DB types                    |
| **Civic Presence**       | `civicPresence.ts`, `nearbyCoordination.ts`                                                                                                  | Proximity detection, temporal continuity, coordination signals                   |
| **Narratives**           | `coordinationNarratives.ts`                                                                                                                  | Human-readable coordination descriptions in Spanish                              |
| **Lifecycle**            | `lifecycle.ts`, `proposalLifecycle.ts`                                                                                                       | Temporal state machines for missions and proposals                               |
| **Evidence**             | `evidence.ts`, `entityInvariants.ts`                                                                                                         | Evidence validation rules, entity constraint checks                              |
| **Entity**               | `entityStateProjection.ts`, `entityAdapter.ts` (in services)                                                                                 | Event → state projection, adapter patterns                                       |
| **Governance**           | `proposalGovernance.ts`, `missionSelection.ts`                                                                                               | Proposal authority rules, mission filtering                                      |

### Cleanliness: 11/14 files are pure (no side effects, no service imports)

The 3 exceptions are documented in 20A findings.

---

## Service Layer

### `src/services/`

Data access, external I/O, orchestration, type mapping.

| Pattern              | Files                                                                                                                                                                                                                                                                                                                                         | Responsibility                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| **Repository**       | `*Repository.ts`, `eventStoreRepository.ts`, `evidenceRepository.ts`, `civicEventsRepository.ts`, `districtRepository.ts`, `missionRepository.ts`, `moderationRepository.ts`, `notificationRepository.ts`, `proposalCommentRepository.ts`, `proposalRepository.ts`, `publicProfileRepository.ts`, `spatialRepository.ts`, `userRepository.ts` | Supabase CRUD, query building, row mapping                       |
| **Adapter/Contract** | `evidenceContract.ts`, `entityAdapter.ts`, `proposalContract.ts`                                                                                                                                                                                                                                                                              | Type transformations between DB rows and domain types            |
| **Business Logic**   | `userProgressDomainService.ts`, `userProgressQueryService.ts`, `missionResolver.ts`                                                                                                                                                                                                                                                           | Orchestration combining multiple repositories + domain functions |
| **Mixed**            | `missions.ts` (763 lines)                                                                                                                                                                                                                                                                                                                     | Read/write/evidence/event for missions — most overloaded file    |
| **Storage**          | `storage/evidenceStorage.ts`                                                                                                                                                                                                                                                                                                                  | File upload, signed URLs, MIME validation                        |

---

## Event System

### Flow

```
User action → useMutation hook → service/repository →
  Domain event emitted (eventEmitter.ts) →
    appendEventToStore (eventStoreRepository.ts, async, fire-and-forget) →
    useEventPropagation (React hook, cache invalidation)

Realtime →
  missionRealtimeBridge (Supabase → React Query reconciliation)
```

### Event Types

| Event                 | Trigger                  | Consumers                              |
| --------------------- | ------------------------ | -------------------------------------- |
| `EvidenceSubmitted`   | Evidence upload          | Cache invalidation, realtime broadcast |
| `EvidenceVerified`    | Admin verification       | Cache invalidation                     |
| `EvidenceRejected`    | Admin rejection          | Cache invalidation                     |
| `EvidenceFlagged`     | Auto-flag                | Cache invalidation                     |
| `MissionCompleted`    | Mission complete         | Cache invalidation, XP grant           |
| `MissionStateUpdated` | State machine transition | Cache invalidation                     |

---

## Territorial Intelligence Pipeline

```
Raw data (Supabase queries)
    → Domain classifiers (classifyDistrictActivity, classifyTerritorialVitality)
    → Narrative builders (buildVitalityNarrative, buildSpatialNarrative)
    → Aggregations (deriveCivicMemoryLine, deriveCoordinationNarratives)
    → UI (CoordinationHub, VitalityCard, DistrictMilestones)
```

### Classification Systems

| Classifier                    | Inputs                                                | Output                                                                             |
| ----------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `classifyDistrictActivity`    | mission count, proposal count                         | `empty │ early │ active │ established`                                             |
| `classifyTerritorialVitality` | activity + presence + persistence + coalition density | `dormant │ fragmented │ reactivating │ emerging │ organizing │ active │ resilient` |
| `detectDormancy`              | days since last activity                              | `active │ quiet │ dormant │ reviving`                                              |
| `classifyOrganizerContinuity` | organizer reappearance rate                           | `none │ early │ established`                                                       |
| `computeTemporalContinuity`   | event cadence                                         | `continuous │ intermittent │ first_steps │ resurging`                              |

---

## Spatial Infrastructure

| Component           | Technology                                       | Purpose                                 |
| ------------------- | ------------------------------------------------ | --------------------------------------- |
| Map rendering       | Leaflet + MarkerCluster                          | Tile map with clustered mission markers |
| Base tiles          | CARTO Voyager                                    | Light, civic-friendly basemap           |
| District boundaries | PostGIS geometry + Supabase RPC                  | Polygon data from migration 20260611    |
| Proximity search    | Haversine (client) + PostGIS ST_DWithin (server) | Nearby missions and proposals           |
| Geocoding           | Google Maps API (optional) with local fallback   | District autocomplete                   |
| SVG projection      | Custom coordinate mapping                        | Territory footprint visualization       |

---

## Realtime Architecture

```
Each authenticated user gets exactly 1 channel:
  kusqa-sync:${userId}
    ├── missions (INSERT, UPDATE) — global catalog
    ├── civic_events (INSERT, target = proposal) — proposal coalition
    └── user_notifications (INSERT, user_id filter) — personal feed

Disconnect handling:
  - wasDisconnected flag on CHANNEL_ERROR / CLOSED
  - flushPendingEvents on re-SUBSCRIBED replays buffered events
  - 400ms debounce on event reconciliation
```

---

## Security Model

| Layer              | Mechanism                                                              |
| ------------------ | ---------------------------------------------------------------------- |
| **Auth**           | Supabase Auth (Google OAuth only)                                      |
| **API access**     | Supabase anon key (public in client)                                   |
| **Data isolation** | RLS policies on every table                                            |
| **Storage**        | `mission-evidence` private (path-prefix RLS), `proposal-images` public |
| **Rate limiting**  | Client-side sliding window (5 actions/min)                             |
| **Telemetry**      | Sentry + PostHog (lazy-loaded, DSN-gated)                              |

---

## Key Repositories

| Repository                 | Primary Tables                   | Key Methods                                |
| -------------------------- | -------------------------------- | ------------------------------------------ |
| `missionRepository.ts`     | `missions`                       | findAll, findById, findByDistrict, create  |
| `proposalRepository.ts`    | `proposals`, `proposal_supports` | createProposal, supportProposal, findAll   |
| `evidenceRepository.ts`    | `mission_evidence`               | findByMission, findByUser, submit          |
| `userRepository.ts`        | `profiles`, `user_progress`      | findProfileByUserId, getCurrentUser        |
| `civicEventsRepository.ts` | `civic_events`                   | listForProfile, listForDistrict            |
| `districtRepository.ts`    | `districts`                      | findAll, findBySlug, getActivityFeed       |
| `spatialRepository.ts`     | —                                | findNearbyProposals, getTerritorialDensity |
