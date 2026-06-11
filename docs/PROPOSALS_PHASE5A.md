# Phase 5A — Reliability & Test Infrastructure

## Summary

Phase 5A establishes a production-grade test infrastructure for KUSQA. It installs happy-dom + @testing-library/react for route integration tests, creates reusable test helpers (renderWithProviders, createSupabaseMock, Zod-valid factories), writes 7 repository contract test suites, expands realtime reconciliation tests, adds 5 route integration test files, and adds an explicit auth boundary unit test.

## What was built

### 5A.0 — Test infrastructure

- **Dependencies**: `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`, `happy-dom@^15` installed as devDeps.
- **vitest.config.ts**: `environmentMatchGlobs` for `.test.tsx` (happy-dom), default environment `node`.
- **vitest.setup.dom.ts**: jest-dom matchers (`@testing-library/jest-dom/vitest`) + `afterEach(cleanup)`.
- **`src/test/createSupabaseMock.ts`**: Chainable Proxy-based supabase-js mock with queue API for controlling table/RPC responses per test.
- **`src/test/renderWithProviders.tsx`**: TanStack Router MemoryRouter + QueryClientProvider wrapper. Accepts `initialEntries`, `routes`, `testPath` for `useParams({ from })` resolution.
- **`src/test/factories.ts`**: Zod-validated row factories (proposal, district, district stats, civic events, public profile, user notification). Schemas match actual DB shapes.
- Old `src/test/supabaseMock.ts` deleted (replaced by `createSupabaseMock.ts`).

### 5A.1 — Repository contract tests (7 files, 41 tests)

| File                                   | Tests | What it covers                                                                                                                       |
| -------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `districtRepository.test.ts`           | 7     | Happy path, Zod rejection, supabase error, zeroed defaults, activity null-filtering, domain shape                                    |
| `proposalRepository.test.ts`           | 9     | GetById, error throw, missing row, getAll, status filter, getSupportCount 0-on-error, supportProposal success/error/23505-idempotent |
| `civicEventsRepository.test.ts`        | 5     | ListForProfile, RPC error returns [], non-array returns [], Zod-failing rows filtered, CIVIC_EVENT_COPY exhaustiveness               |
| `notificationRepository.test.ts`       | 6     | findInboxByUserId, error throw, countUnread, markRead, markAllRead                                                                   |
| `publicProfileRepository.test.ts`      | 5     | Happy path, RPC error null, non-array null, Zod failure null, SECURITY DEFINER leak prevention                                       |
| `proposalConversionRepository.test.ts` | 5     | Convert success, error translation, ALREADY_CONVERTED error, reopen success, listLifecycleEvents                                     |
| `moderationRepository.test.ts`         | 4     | Report success, supabase error, malformed input rejection, unknown reason code rejection                                             |

### 5A.2 — Realtime reconciliation tests

- **`missionRealtime.test.ts`** expanded from 3 → 11 tests:
  - `proposal.support_changed` decision + missionIds scope check
  - `mission.catalog_updated` scope
  - `mapCivicEventPayloadToProposalSupport` (proposal_id extraction, fallbackActorId, missing target_id, wrong kind)
  - `MISSION_REALTIME_CHANNELS` channel name check

### 5A.3 — Route integration tests (5 files, 17 tests)

| File                                 | Tests | What it covers                                                                          |
| ------------------------------------ | ----- | --------------------------------------------------------------------------------------- |
| `app.perfil.$userId.test.tsx`        | 4     | Loading spinner, not-found, public profile renders, own-profile badge                   |
| `app.notificaciones.test.tsx`        | 4     | Empty state, notification row renders, territory context line, disabled settings button |
| `app.mision.$missionId.test.tsx`     | 3     | Loading skeleton, error/not-found, mission detail renders                               |
| `app.distrito.$slug.test.tsx`        | 3     | Loading spinner, error page, district page renders                                      |
| `app.propuesta.$proposalId.test.tsx` | 3     | Loading spinner, error state, proposal detail renders                                   |

All route tests use `vi.doMock` + `vi.resetModules` per test with `renderWithProviders` for TanStack Router + QueryClient context.

### 5A.4 — Auth boundary TS test

- **`authBoundaries.test.ts`** (8 tests):
  - Public profile: Zod schema strips synthetic fields, rejects invalid uuid
  - Notifications: RLS error throws, returned data shape is correct
  - Proposal conversion: NOT_AUTHOR error translated, unrecognized error falls back
  - Support proposal: 23505 treated as success, other errors propagated

## Test counts

- **Total tests**: 81 (was 56 before Phase 5A.3–5A.4)
- **Test files**: 15

## Verification

- `npm run typecheck`: ✓ passes
- `npm run lint`: 123 errors (pre-existing baseline, zero new errors)
- `npm run test`: 81/81 passing
- `npm run build`: blocked by pre-existing `@cloudflare/vite-plugin` issue (not introduced by Phase 5A)

## Files changed

- New: 5 route test files, 1 auth boundary test file, vitest.setup.dom.ts, createSupabaseMock.ts, renderWithProviders.tsx, vitest.d.ts, ambient.d.ts
- Modified: factories.ts (Zod schemas updated), infra.test.tsx (updated for new mock), vitest.config.ts (happy-dom env), tsconfig.json (types include vitest)
- Deleted: supabaseMock.ts (old mock)
