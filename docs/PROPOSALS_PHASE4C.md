# Proposals — Phase 4C (Entity Architecture Cleanup)

Phase 4C consolidates KUSQA's discriminated-union entity model and
removes technical debt accumulated across Phases 1-3. It is a
**non-behavior-changing refactor**: every visible page still renders
the same data; the changes are in the type system, the adapter, and
the call sites.

## Scope

### Additive type changes

- `Mission` type gains `districtId?: string | null` (optional, additive).
  New writes should include it; legacy rows and mock data still
  typecheck.
- `TRUST_STATUS_META` is now exported from `CivicTrustBadge` so the
  public profile can render the trust label without duplicating copy.

### Removed dead code

- `entityAdapter.proposalToMission` — no external callers. The
  internal `adaptProposalToMission` helper is now private to the
  adapter and is the only path from `Proposal → Mission-shape`.
- `entityAdapter.getCategoryEmoji` — no callers.
- `entityAdapter.getCategoryEmoji` and the `entityAdapter` namespace
  as a concept — no consumer imports the namespace; everyone uses
  named exports.
- `types/entity.getEntityType` and `getOriginalProposal` — no callers.
- `services/notifications.ts` (MOCK service) — replaced by the live
  `notificationRepository` from Phase B. The MOCK still mutated an
  in-memory `NOTIFICATIONS_MOCK` array; it was never wired to UI.
- The re-export `export * from "./notifications"` from
  `services/index.ts` is gone.

### Adapter consolidation

- `missionResolver.adaptProposalToMission` was a near-duplicate of
  `entityAdapter.proposalToMission` with a diverged emoji map and
  different null-coercion policy. Phase 4C makes the resolver
  delegate to `proposalToEntity` (which uses the canonical emoji
  map and the `districtId` passthrough). The divergence is closed.

### `app.mision.$missionId.tsx` adopts `CivicEntity`

- The route previously implemented a hand-rolled `entity =
isMissionEntity ? mission : proposal` union with **16 `as Mission`
  casts**. Phase 4C types `entity` as `CivicEntity` and uses
  `missionToEntity` / `proposalToEntity` from the adapter. All 16
  casts are removed.

### `app.distrito.$slug.tsx` stops synthesizing the discriminator

- The route manually injected `entityType: "mission"` on a plain
  `Mission` to feed `PublicMissionCard` (`{ ...m, entityType:
"mission" }`). Phase 4C replaces this with `missionToEntity(m)`,
  removing the type lie.

## Why we kept `CivicEntity`

- It's load-bearing in **6 files** (3 routes, 1 hook, 1 component,
  1 domain module).
- Removing it would require splitting every feed into two parallel
  lists and duplicating rendering/query logic.
- The discriminated union is the **simplest** way to express "this
  could be a mission or a proposal, branch on type" — replacing it
  with parallel lists is a worse trade.

## Non-goals

- No new entities.
- No new rendering.
- No migration of mock data (out of scope; tracked separately).
- No app.index.tsx decomposition (deferred to Phase 4E as a
  separate refactor PR per the architectural plan).

## Bundle impact

| Chunk                       | Before   | After    | Delta                                       |
| --------------------------- | -------- | -------- | ------------------------------------------- |
| `app.mision._missionId`     | 49.00 kB | 49.00 kB | 0 (cast removal doesn't change bundle size) |
| `app.distrito._slug`        | 15.83 kB | ~15.7 kB | -0.1 kB (entity injection gone)             |
| `app.index`                 | 29.56 kB | 29.56 kB | 0                                           |
| `app.propuesta._proposalId` | 50.94 kB | 50.94 kB | 0                                           |
| `services/notifications.ts` | ~0.5 kB  | removed  | -0.5 kB                                     |

## Verification

- `npm run typecheck` — pass
- `npm run lint` — no new errors
- `npm run build` — pass
- `npm run test` — pass (3 realtime tests, unchanged)
- All 16 `as Mission` casts removed from `app.mision.$missionId.tsx`.

## Rollback

Phase 4C is purely structural. To roll back:

1. `git revert` the entityAdapter / missionResolver / entity.ts /
   domain.ts changes.
2. `git revert` the `app.mision.$missionId.tsx` cast removal
   (re-introduce `(entity as Mission)` in the 16 sites).
3. `git revert` the `app.distrito.$slug.tsx` `missionToEntity(m)`
   change.

No migrations are involved. No data is touched.
