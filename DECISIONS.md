# Architecture Decisions (ADR-lite)

Decisions are recorded as single-paragraph entries. Each entry includes the date, context, decision, and rationale.

---

## 2026-06-10: `Initiative` as the unique read-model root

**Context:** Proposal and Mission were diverging as independently rendered entities, leading to duplicated UI surfaces, branching action logic, and a fragmented map layer. The roadmap requires a single projection for the feed, map, and action bar.

**Decision:** Consolidate toward `Initiative` as the sole read-model root. `InitiativeMapEntity` is the map-display projection. `Proposal` and `Mission` remain write-models (DB rows) but are projected into `Initiative` at the repository boundary. No new sibling models (e.g. `CivicEntity`) are created. Derivation/projection over duplication.

**Rationale:** Single source of truth for all UI surfaces reduces action parity bugs, simplifies the action bar contract, and enables async-first coordination without branching per source type.

---

## 2026-06-10: `InitiativeActionBar` as the single CTA surface

**Context:** Every entity detail page and card had its own set of action buttons wired independently, causing action-parity gaps (e.g. missing `report` on feed cards, missing `edit` on mission detail).

**Decision:** `InitiativeActionBar` is the single component for all CTAs across the app. Every surface (feed card, map popup, detail page, bottom sheet) renders it with the same canonical `relationship` derivation. The domain module `initiativeActions.ts` defines the canonical action set and relationship logic.

**Rationale:** A single rendering contract eliminates the 20+ action-parity gaps found in audit. Adding a new action (e.g. `comment`) is now a one-place change.

---

## 2026-06-10: Single `InitiativeWall` for comments, no per-type walls

**Context:** Proposals had `proposalCommentRepository`, missions had no comment support, and each source type risked a separate wall component.

**Decision:** `initiativeCommentRepository` (backed by a unified `initiative_comments` table) serves both proposal and mission comments. `InitiativeWall` is the single React component. Source type is a column, not a schema.

**Rationale:** Prevents duplication of comment infrastructure. Enables cross-type features (e.g. a proposal comment appearing on the related mission).

---

## 2026-06-10: Async-first coordination via projections

**Context:** Coordination narratives were computed synchronously inside route components, blocking rendering and mixing concerns.

**Decision:** Coordination narratives are derived asynchronously via `deriveCivicJourney` → `deriveCivicBiography` pipeline. No I/O in domain functions. React hooks (`useCoordinationNarratives`) are thin wrappers around pure domain functions, called after data arrives.

**Rationale:** Keeps domain pure and testable. Enables future server-side projection without restructuring.

---

## 2026-06-10: `initiativeActions.ts` stays in `src/domain/`, not moved to `src/core/`

**Context:** The roadmap suggested creating `src/core/` for shared tokens + the canonical action set. Moving `initiativeActions.ts` to core would introduce churn across all feature imports.

**Decision:** `initiativeActions.ts` and `initiativeAction.ts` remain in `src/domain/`. No `src/core/` directory is created at this time. The domain layer already serves as the shared, framework-agnostic foundation.

**Rationale:** Avoids unnecessary relocation churn. The domain directory is the natural home for action logic. If `src/core/` is created later for infra-level tokens (e.g. branded constants, shared Zod schemas), it will not include action types.

---

## 2026-06-10: `eslint-plugin-boundaries` — module boundary enforcement

**Context:** Features were importing from other features (19 violations found), creating implicit coupling and making the unification track fragile to automated PRs (e.g. lovable-dev[bot]).

**Decision:** Installed `eslint-plugin-boundaries`. Elements defined per directory: `src/features/*/`, `src/domain/`, `src/services/`, `src/components/`, `src/routes/`, `src/hooks/`, `src/lib/`, `src/types/`, `src/utils/`, `src/constants/`, `src/design/`, `src/test/`. Rule: features cannot import from other features; only from domain, services, components, and shared layers. Currently at **warn** level — violations recorded below, to be resolved incrementally.

**Violations (warn, 19 total):**

| Source feature             | Target feature           | File                                                             |
| -------------------------- | ------------------------ | ---------------------------------------------------------------- |
| auth → progression         | `civicRoute` constants   | `src/features/auth/hooks/useCurrentUser.ts:10`                   |
| coordination → districts   | `useTerritorialGeometry` | `src/features/coordination/hooks/useCoordinationNarratives.ts:2` |
| home → auth                | `useCurrentUserId`       | `src/features/home/components/InitiativeCard.tsx:9`              |
| home → proposals           | `useSupportProposal`     | `src/features/home/components/InitiativeCard.tsx:10`             |
| home → actions             | `InitiativeActionBar`    | `src/features/home/components/InitiativeCard.tsx:11`             |
| home → actions             | `shareInitiative`        | `src/features/home/components/InitiativeCard.tsx:12`             |
| initiativeWall → auth      | `useCurrentUserId`       | `src/features/initiativeWall/components/InitiativeWall.tsx:7`    |
| map → districts            | `useTerritorialGeometry` | `src/features/map/components/MapView.tsx:14`                     |
| map → actions              | `InitiativeActionBar`    | `src/features/map/layers/useMissionMarkerLayer.tsx:15`           |
| profile → community        | `deriveCivicTrust`       | `src/features/profile/components/PublicProfileHeader.tsx:17`     |
| progression → auth         | `useCurrentUser`         | `src/features/progression/hooks/useProgression.ts:7`             |
| proposals → auth           | `useCurrentUserId`       | `src/features/proposals/components/ConversationThread.tsx:7`     |
| proposals → auth           | `useCurrentUserId`       | `src/features/proposals/components/ConversionCta.tsx:15`         |
| proposals → auth           | `useCurrentUserId`       | `src/features/proposals/components/ProposalStickyCTA.tsx:10`     |
| proposals → districts      | conversion hooks         | `src/features/proposals/components/ConversionCta.tsx:13`         |
| proposals → actions        | `InitiativeActionBar`    | `src/features/proposals/components/ProposalStickyCTA.tsx:8`      |
| proposals → initiativeWall | lazy import              | `src/features/proposals/components/ProposalTabs.tsx:11`          |

**TODO:** Move `useCurrentUser`/`useCurrentUserId` to `src/hooks/` or `src/auth/` as shared hooks. Lift `InitiativeActionBar` to `src/components/`. Move shared constants (`civicRoute`) to `src/constants/`.

---

## 2026-06-10: Unified `InitiativeEvent` catalog — three sources adapt, no duplication

**Context:** The Initiative aggregate had three fragmented event vocabularies: `KusqaDomainEvent` (src/domain/events.ts, mission/evidence only), `TerritorialEvent` (src/domain/territorialEvent.ts, proposal + mission UI events), and DB `proposal_lifecycle_events` (cohort/collaborator lifecycle). Consumers had to know all three, and the projection pipeline (`summarizeEventsToImpact`) only understood `TerritorialEvent`.

**Decision:** Created `src/domain/initiativeEventCatalog.ts` with a single discriminated union `InitiativeEvent` (19 variants covering idea→gathering→active→completed→dormant). Three pure adapters map each source into the catalog without touching the sources (`kusqaEventToInitiative`, `territorialEventToInitiative`, `lifecycleEventToInitiative`). The projection engine `summarizeInitiativeEvents` consumes `InitiativeEvent[]` directly; `summarizeEventsToImpact` retains its original signature and delegates via the adapter.

**Rationale:** Additive/projection layer (Step 5 of the unification track). Zero source changes. One catalog makes the event model discoverable, enables compile-time exhaustive checks (via `never` guards in tests), and paves the way for a single event-sourcing projection. The 43-test suite covers every variant with runtime + compile-time exhaustiveness.

---

## 2026-06-10: Canonical MissionCategory — superset, no silent folds

**Context:** Proposals used 6 Spanish-named categories (Medio ambiente, Educación, Arte & cultura, Comunidad, Salud, Tecnología). Missions used 5 English-named DB values (environment, infrastructure, community, education, health). The mapper folded Arte & cultura→community and Tecnología→infrastructure, losing semantic distinctions. Both `DbCategory` (mapping type) and `CATEGORY_METADATA` (unused duplicate in `src/constants/categoryMetadata.ts`) added confusion.

**Decision:** The 6 Spanish-named values are the ONE canonical `MissionCategory` list. The missions DB CHECK constraint is expanded from 5 to 6 values (the same Spanish values). `DbCategory`, `CATEGORY_LABEL`, `CATEGORY_TO_DB`, `DB_CATEGORY_EMOJI`, `categoryToDb`, `dbToCategory`, and `dbCategoryEmoji` are removed from `src/domain/categories.ts`. The SQL conversion functions in `convert_proposal_to_mission` pass through the proposal category directly (no CASE fold). Existing mission rows are backfilled: those linked to a proposal via `proposal_lifecycle_events` recover the original proposal category; unlinked rows use the reverse mapping (infrastructure→Tecnología, community→Comunidad).

**Rationale:** One source of truth removes the folding loss. No silent mapping means every category round-trips correctly through proposal→mission conversion. The dead `CATEGORY_METADATA` duplicate in constants is noted for cleanup in a follow-up.

---

## 2026-06-10: Unified writes via `missionMutationEngine` behind `VITE_USE_UNIFIED_WRITES`

**Context:** Proposal mutations (support, archive, convert, comment) used raw `useMutation` with ad-hoc optimistic updates and no dedup/lane guarantees. Mission mutations (join, complete) already used the `missionMutationEngine` (concurrencia optimista, dedup, reconciliación realtime). The two write paths had different resiliency guarantees.

**Decision:** Extended `missionMutationEngine` with 6 new `MissionMutationKind` values (`supportInitiative`, `joinInitiative`, `commentInitiative`, `completeInitiative`, `archiveInitiative`, `convertInitiative`) and corresponding `rollbackKeys` entries. Created 6 unified mutation hooks in `src/features/initiative/mutations/` that each emit an `InitiativeEvent` (from the catalog) after a successful write. The flag `VITE_USE_UNIFIED_WRITES` (default `false`) routes existing hooks (`useSupportProposal`, `handleArchive`) through the engine when enabled. When `false`, behavior is identical to the pre-existing path.

**Rationale:** The engine provides dedup, per-mission-lane serialization, stale-fetch guards, pin/rollback of query cache, and coalesced invalidation — all of which proposal writes lacked. The flag makes the migration reversible at the config level (no code changes needed to toggle). 10 new tests cover the flag check and all 19 `InitiativeEvent` variants through the emission pipeline.

---

## 2026-06-12: Canonical runtime read path for initiatives (audit debt 2.1)

**Context:** The DB has a canonical `public.initiatives` table (migration 20260617000000) that unions all proposals and missions, kept in sync via triggers from the legacy tables (migration 20260626000000). However, the runtime read path in `initiativeResolver.ts` reads from `"missions"` and `"proposals"` (legacy tables) via `missionRepository.findAll()` and `proposalRepository.getAllProposals()` — it never queries `"initiatives"` directly. Two truths are inflight: the DB table is canonical, but the runtime projection reads from the legacy tables behind the default-off flag `VITE_USE_INITIATIVE_READ_MODEL=false`.

**Decision:** Phase 3 assumes `VITE_USE_INITIATIVE_READ_MODEL=true` as the canonical runtime read path. This means `initiativeResolver.ts` (and only the resolver) is the single projection boundary through which all Initiative-shaped data flows. The resolver reads from legacy `"missions"` + `"proposals"`; it does NOT read from `public.initiatives` during Phase 3. A future phase will swap the resolver's source to `public.initiatives` directly, at which point the legacy-table triggers become the reverse-sync mechanism, and the resolver becomes a thin pass-through. `VITE_USE_UNIFIED_WRITES=false` remains unchanged — write path migration is independent.

**Rationale:** The resolver is the existing projection boundary; swapping its source (legacy tables → `public.initiatives`) is a single-file change inside `src/services/`, invisible to all consumers. Feature code already depends on the `Initiative` shape and the resolver's interface. Keeping the flag default `false` avoids coupling Phase 3 uptake to the source swap. This entry resolves audit debt 2.1 by stating unambiguously that the resolver is the canonical entrance, regardless of which underlying table it queries.
