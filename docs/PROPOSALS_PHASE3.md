# Proposals — Phase 3 (Territorialization)

Phase 3 takes the proposals system from "a proposal can be supported" to
"a proposal lives in a place, and a place can gather enough support to
become a real mission". The territory is the primary surface; the
proposal is the seed.

## Scope

- **3A — District system**: a canonical `districts` table, public stats
  view, and 4 SECURITY DEFINER RPCs to surface activity without leaking
  PII.
- **3B — Proposal → Mission conversion**: when a proposal crosses its
  support + collaborator threshold, the author confirms a conversion
  that creates a real mission and locks the proposal. A full audit
  trail is preserved.
- **3C — Honest district UX**: every district page renders truthfully,
  including the "Sé quien inicie la primera" empty state when no
  activity exists. Deep-link chips from the feed and map take users to
  the district page.

## Non-goals

- No leaderboards, no competitive scoring, no synthetic scores, no
  fake engagement numbers.
- No auto-trigger of conversion (no "magic" mission creation). The
  author always confirms.
- No retroactive migration of legacy data into the new system. The
  baseline migration is idempotent and additive.
- No realtime push for district activity. The 30-second stale time is
  honest about the freshness.

## Migrations (additive, idempotent, in this order)

| File                                                | Purpose                                                                                                                                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0000_baseline.sql`                                 | Commit the core schema (missions, mission_participants, user_progress, profiles, proposals, proposal_supports) that was referenced but never committed.                              |
| `20260526130000_seed_realistic_missions.sql`        | Rewritten to use the real schema columns; 14 missions, idempotent on title.                                                                                                          |
| `20260526140000_seed_vitality.sql`                  | Rewritten: 6 profiles, mission_participants via join, user_notifications via DO block, 3 realistic proposals in Rímac / San Borja / VES.                                             |
| `20260606010000_create_districts_table.sql`         | New `districts` table (33 entries), RLS public-read, region CHECK.                                                                                                                   |
| `20260606020000_add_district_fk_columns.sql`        | `district_id` nullable FK on proposals/missions/profiles; backfill via `kusqa_district_slugify`.                                                                                     |
| `20260606030000_district_aggregations_and_rpcs.sql` | `district_stats` view + 4 SECURITY DEFINER RPCs; fixes `mission_events` SELECT RLS.                                                                                                  |
| `20260606040000_proposal_conversion.sql`            | `has_converted_mission_id` + `source_proposal_id`; `proposal_lifecycle_events` table + enum; `convert_proposal_to_mission`, `reopen_proposal`, `get_proposal_lifecycle_events` RPCs. |

All RPCs are `SECURITY DEFINER` and explicitly `REVOKE` EXECUTE FROM PUBLIC,
then `GRANT` to `anon, authenticated` so the public read paths are
auditable. INSERT on `proposal_lifecycle_events` is server-only — no
`authenticated` INSERT policy. Every row in that table is server-written.

## Domain layer (`src/domain/territoryAggregations.ts`)

Pure functions over `TerritorialImpactSummary`:

- `classifyDistrictActivity` — quiet bucketing (sin_actividad, recien_iniciado, en_movimiento, con_trayectoria). No levels, no leaderboards.
- `DISTRICT_ACTIVITY_COPY` — the human copy per bucket.
- `formatTerritorialImpact` — single-line truthful summary.
- `isFirstMovementNeeded` / `missingFirstMovements` — used to render the "Sé quien inicie la primera" empty state.
- `deriveCivicMemoryLine` — narrative that explicitly says "primera vez" when there is no history, instead of inventing one.

## Repositories

- `src/services/districtRepository.ts` — strongly typed reads (Zod-validated) with zeroed defaults on non-critical errors. Stats always render.
- `src/services/proposalConversionRepository.ts` — wraps the 3 conversion RPCs. Error codes (`UNAUTHENTICATED`, `PROPOSAL_NOT_FOUND`, `NOT_AUTHOR`, `THRESHOLD_NOT_MET`, `NOT_CONVERTED`) are translated to Spanish.

## Hooks / query options

- `useDistrict`, `useDistricts`, `useDistrictStats`, `useDistrictActivity`, `useDistrictFeed`, `useDistrictTopSupporters` — all use explicit `useQuery<T>` generics so consumers get the right shape.
- `useProposalLifecycle` — append-only 5-min stale.
- `useConvertProposal` / `useReopenProposal` — invalidates the right keys on success.

## Routes

- `src/routes/app.distrito.$slug.tsx` — the district page. Hero (region-aware), stats grid, first-movement empty state, active proposals, recent missions, top supporters, activity feed, narrative, footer. Lazy-loads the map preview and the activity feed separately.
- Deep-link chips added to `app.index.tsx` (feed) and `app.mapa.tsx` (mission/proposal popups) → `/app/distrito/$slug`.

## Proposal detail page changes

- `ConversionCta` — only renders for the proposal's author. Shows one of:
  - `share_to_gather_support` (handled by hero share button, no extra UI)
  - `invite_collaborators` — "Invita a co-organizar"
  - `convert_to_mission` — "Tu iniciativa ya puede convertirse en misión" (ceremony preserved)
  - `await_collaborators` — "Esperando respuestas a las invitaciones"
  - `no_action` — not rendered
- `ProposalLifecycleTimeline` — renders the `proposal_lifecycle_events` history (Umbral alcanzado, Organización confirmada, Convertida en misión, Reabierta).
- Post-conversion undo: a discreet "Reabrir propuesta" affordance, gated behind a confirmation card.

## Bundle budget (gzipped)

| Route                       | Size                                                    |
| --------------------------- | ------------------------------------------------------- |
| `app.distrito._slug`        | **3.25 kB** (well under budget)                         |
| `app.propuesta._proposalId` | 14.16 kB (Phase 2A baseline 4.16 kB + conversion 10 kB) |
| `app.index`                 | 5.99 kB                                                 |

The map preview and the activity feed are split into separate lazy
chunks (2.16 kB and 3.40 kB) so the district page is fast on first
load and the heavier pieces arrive only on interaction.

## Authenticity guardrails

- `CivicAnalytics` (the map's side panel) was rewritten to remove the
  "Líderes de Activismo Cívico" leaderboard with synthetic scores and
  XP counts. It is now a truthful "Distritos activos" list (just
  derived from mission counts) plus the proximity recommendations.
- The district page never displays counters as scores — only as
  "X misiones activas" / "X propuestas reunidas".
- The empty state when a district has no activity is the verbatim
  line "Sé quien inicie la primera", with no fake seeding.

## Verification

- `npm run typecheck` — pass
- `npm run lint` — 134 pre-existing errors (down from 178), zero new
  Phase 3 errors
- `npm run build` — pass; gzipped district route under 5 kB
- `npm run test` — pass (3 realtime tests, unchanged)
