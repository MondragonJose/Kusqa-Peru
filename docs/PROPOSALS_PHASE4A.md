# Proposals — Phase 4A (Identity & Profiles)

Phase 4A introduces the **public profile** — a read-only, public-safe
view of any user. It also introduces `civic_events`, the canonical
append-only event log that will back the realtime bridge in Phase 4B
and the district timeline going forward.

## Scope

- `civic_events` table + `append_civic_event` SECURITY DEFINER
  function + `get_civic_events_for_profile` reader RPC.
- `get_public_profile` SECURITY DEFINER RPC — the only auditable
  read path for other users' profiles. Keeps `profiles` RLS own-only.
- `PublicProfileRepository` + `usePublicProfile`,
  `usePublicProfileActivity` hooks.
- `/app/perfil/$userId` route (new — code-split, ~19 kB chunk).
- PublicProfileHeader, PublicProfileStats, PublicProfileTerritory,
  PublicProfileTimeline components.
- `TRUST_STATUS_META` now exported from `CivicTrustBadge` so the
  public profile can render the trust label without duplicating the
  copy.

## Non-goals

- No editing on the public profile (that's `/app/perfil` for the
  current user; unchanged).
- No "supported proposals list" / "co-organized proposals list" /
  "completed missions list" — the public profile shows the counts
  from `get_public_profile` and the activity timeline from
  `civic_events`. Drilling into the full list is a follow-up.
- No follow / friend mechanics.
- No score / leaderboard.

## Migrations

| File | Purpose |
|---|---|
| `20260607010000_create_civic_events.sql` | `civic_events` table + `civic_event_kind` enum + `append_civic_event` + `get_civic_events_for_profile` RPC + realtime publication. |
| `20260607020000_public_profile_rpc.sql` | `get_public_profile` SECURITY DEFINER RPC returning the public-safe projection with counters and top districts. |

All operations are `CREATE IF NOT EXISTS` / `CREATE OR REPLACE` /
`ADD COLUMN IF NOT EXISTS` — fully additive, fully idempotent.

## Trust model

`civic_events`:

- INSERT — only via `append_civic_event()` SECURITY DEFINER (server-
  only writes; no `authenticated` INSERT policy).
- SELECT — `auth.uid() = actor_id` (own-rows only).
- Public readers go through `get_civic_events_for_profile` and
  `get_district_activity` (Phase 3A, unchanged). These RPCs are
  the only way to read other users' events.

`get_public_profile`:

- SECURITY DEFINER, `STABLE`.
- Returns a strictly public-safe projection: no email, no auth
  metadata, no private payload.
- The `profiles` table is NOT loosened. Own-only RLS remains.

## Bundle impact

| Route / chunk | Size (gz, server build) | Note |
|---|---|---|
| `app.perfil._userId` | **19.46 kB** (raw) | New dedicated chunk, was absorbed in `app-*.js` shared (16.6 kB) before. |
| Shared `app-*.js` | 16.63 kB | Unchanged (the 676 LOC profile was not in this chunk — it was in shared-`app` but the split didn't add much). |

The public profile is now properly code-split. The first-load cost
of a `/app/perfil/$userId` visit is ~19 kB (raw) plus the shared
chunk.

## Empty-state copy

The timeline's empty state is honest:

> Sin movimientos aún. Cuando esta persona participe, su huella aparecerá aquí.

The header's trust badge always shows the actual derived status
(`semilla`, `explorador`, `guardian`, `tejedor`, `lider`) with the
meta description — no "you're amazing!" copy, no fake engagement
numbers.

## Verification

- `npm run typecheck` — pass
- `npm run lint` — no new errors
- `npm run build` — pass; new `app.perfil._userId` chunk
- `npm run test` — pass

## Rollback

To roll back Phase 4A, drop the two new migrations and remove the
new files. None of the existing routes reference the new code paths
yet (the public profile is a fresh route). Steps:

1. `drop function public.get_public_profile(uuid);`
2. `drop function public.get_civic_events_for_profile(uuid, int);`
3. `drop function public.append_civic_event(...);`
4. `drop table public.civic_events;`
5. `rm -rf src/features/profile src/routes/app.perfil.$userId.tsx src/services/civicEventsRepository.ts src/services/publicProfileRepository.ts`
6. Remove `TRUST_STATUS_META` export from `CivicTrustBadge.tsx`.
