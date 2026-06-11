# Phase 20 — Architectural Coherence & Semantic Consolidation Report

## Summary

| Area                            | Status                                   | Changes                                                                        |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| **20A** Domain Boundary         | ✅ 2 architectural violations fixed      | `eventStore.ts` → services, `eventHandlers.ts` → hooks                         |
| **20B** Narrative Consolidation | ✅ Audited, no duplication introduced    | 6 narrative subsystems mapped, ~113 narrative strings catalogued               |
| **20C** Naming Coherence        | ✅ `social` → `civic` across 8 locations | Badges, notifications, types, labels                                           |
| **20D** Folder Cleanup          | ✅ 3 structural cleanups                 | Dead utils/map.ts removed, Haversine consolidated, barrels pruned              |
| **20E** Dead Path Removal       | ✅ 22 unused packages removed            | Radix (15), data pkgs (2), UI pkgs (3), framework pkgs (1), + 1 dead file      |
| **20F** Documentation           | ✅ Architecture guide rewritten          | Subsystem explanations, layer rules, territorial intelligence pipeline         |
| **20G** Bundle Audit            | ✅ Audited, unused deps removed          | No manualChunks needed (TanStack auto code-splits routes, Leaflet lazy-loaded) |

---

## Deliverables

### Structural Changes

| File                                   | Action                                                   | Rationale                                                                                                |
| -------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/domain/eventStore.ts`             | Kept (pure) + created `services/eventStoreRepository.ts` | `eventStore.ts` had Supabase I/O — violates domain purity. Pure `replayEntityState` stays in domain.     |
| `src/domain/eventHandlers.ts`          | Moved → `hooks/useEventPropagation.ts`                   | Was a React hook (`useEffect`, `QueryClient`) disguised as domain file.                                  |
| `src/features/map/utils/projection.ts` | Delegates to `domain/territorial.ts`                     | `calculateHaversineDistance` was a dupe. Now re-exports `calculateDistance` from domain.                 |
| `src/utils/map.ts`                     | Removed                                                  | Contained `getClosestRegion` (duplicated `inferRegionFromCoords`), dead wrapper, dead utility functions. |
| `src/domain/eventStore.ts` (new)       | Pure replay only                                         | After extraction, contains only `replayEntityState` — a pure sort function.                              |

### Name Changes

| Location                                     | Before                            | After                            |
| -------------------------------------------- | --------------------------------- | -------------------------------- |
| `types/domain.ts:76`                         | `type: "social"`                  | `type: "civic"`                  |
| `notifications/types/index.ts:14`            | `"social"`                        | `"cívica"`                       |
| `notifications/types/index.ts:50`            | `social: "Social"`                | `cívica: "Cívica"`               |
| `notifications/types/index.ts:61`            | `social: "bg-accent"`             | `cívica: "bg-accent"`            |
| `notifications/components/CivicFeed.tsx:38`  | `"social"`                        | `"cívica"`                       |
| `badges/types/index.ts:14`                   | `"social"`                        | `"cívica"`                       |
| `badges/constants/civicBadges.ts:92,103,114` | `category: "social"`              | `category: "cívica"`             |
| `badges/components/BadgeGrid.tsx:22,32`      | `social: "Sociales"` / `"social"` | `cívica: "Cívicas"` / `"cívica"` |
| `badges/components/BadgeCard.tsx:21`         | `social: "👥"`                    | `cívica: "👥"`                   |

### Packages Removed (22)

| Category                 | Packages                                                                                                                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unused Radix** (15)    | `accordion`, `alert-dialog`, `aspect-ratio`, `checkbox`, `collapsible`, `context-menu`, `hover-card`, `menubar`, `navigation-menu`, `popover`, `scroll-area`, `separator`, `slider`, `toggle-group`, `tooltip` |
| **Unused data** (2)      | `pe-atlas`, `topojson-client`                                                                                                                                                                                  |
| **Unused UI** (3)        | `cmdk`, `input-otp`, `react-day-picker`, `react-resizable-panels`                                                                                                                                              |
| **Unused framework** (1) | `@tanstack/start` (redundant with `@tanstack/react-start`)                                                                                                                                                     |

### Files Removed

| File                          | Lines | Reason                               |
| ----------------------------- | ----- | ------------------------------------ |
| `src/utils/map.ts`            | 44    | Dead code, duplicates domain         |
| `src/domain/eventHandlers.ts` | 139   | Moved to hooks (was React in domain) |

### Documentation

- `docs/architecture.md` — Complete architecture guide with layer rules, subsystem tables, event flow, territorial intelligence pipeline, security model, and key repository map
- This report

---

## Verification

| Check     | Result                   |
| --------- | ------------------------ |
| Typecheck | ✅ Clean                 |
| Build     | ✅ 2.08s                 |
| Tests     | ✅ 206 passed (23 files) |

---

## Remaining Strategic Debt Register

| #   | Debt                                                                                   | Impact                                  | Mitigation                                                                                            |
| --- | -------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | `services/missions.ts` (763 lines, 6+ responsibilities)                                | Hard to maintain, test, or reason about | Incrementally extract: `missionWriteService.ts`, `missionEvidenceService.ts`, `missionReadService.ts` |
| 2   | `domain/territorialEvent.ts` imports service types                                     | Domain depends on services (inverted)   | Define `CivicProfileEvent`/`ProposalLifecycleEvent`/`DistrictActivity` interfaces in domain           |
| 3   | `domain/spatialRelationships.ts` + `domain/nearbyCoordination.ts` import service types | Same inversion                          | Define domain interfaces, let services implement                                                      |
| 4   | Duplicate narrative vocabulary across 3+ files                                         | Tone changes need multi-file edits      | Create shared narrative constants file (`narrativeLexicon.ts`)                                        |
| 5   | `features/auth/useCurrentUser.ts` imports from `features/progression/`                 | Cross-feature coupling                  | Extract progression constants to shared location                                                      |
| 6   | `services/missionRepository.ts` contains UI formatting                                 | Repository should not format UI         | Move `formatMissionDate`, `CATEGORY_EMOJI`, `CATEGORY_LABEL` to presentational layer                  |
| 7   | `spatialRepository.ts` contains pure domain functions                                  | Should be in domain                     | Move `buildHierarchy`, `regionCenter`, `regionDisplayName`, `svgCoords` to `domain/spatial.ts`        |
| 8   | `domain/proposalLifecycle.ts` contains UI copy                                         | Domain should not have UI strings       | Move `PROPOSAL_PHASE_COPY` to constants/features/proposals                                            |
| 9   | `services/civicEventsRepository.ts` exports `CIVIC_EVENT_COPY`                         | Service should not export copy          | Move to constants/features/events                                                                     |

---

## Guidance for Future Phases

1. **Services/missions.ts split** is the single highest-impact refactor remaining. It touches every mission-related flow.
2. **TerritorialEvent aggregate** should own its types. Extract proposal/event/district interfaces into domain and have services adapt to them.
3. **Narrative lexicon** consolidation would reduce maintenance burden when tuning tone/voice.
4. **Domain purity** should be enforced in PR review — no domain file should import from services/features/lib/supabase.
5. **Feature coupling** (auth→progression) should be resolved before adding new features that cross boundaries.
