# ADR-0001 — civic_events as the canonical event backbone

**Status:** Accepted (Phase 4A)
**Date:** 2026-06-07
**Deciders:** Architecture review

## Context

KUSQA's realtime bridge (`missionRealtimeBridge.ts`) subscribes to
`missions` and `user_notifications` directly. As Phase 4 introduces
proposal realtime, we have a choice:

- **(A)** Add each new domain table (`proposal_supports`,
  `proposal_comments`, `proposal_collaborators`,
  `proposal_lifecycle_events`) to the `supabase_realtime`
  publication, write one mapper per table, and let the bridge fan out
  per-table events.

- **(B)** Add a single `civic_events` append-only log. Domain
  mutations (proposal support, comment, completion, etc.) write to
  `civic_events` via SECURITY DEFINER triggers / RPCs. The bridge
  subscribes to `civic_events` only and dispatches a uniform
  domain-event stream.

## Decision

We adopt **(B)**. `civic_events` is the single source of truth for
all user-visible activity. See
`supabase/migrations/20260607010000_create_civic_events.sql`.

## Consequences

### Positive

- **One subscription, one mapper.** The bridge subscribes to a single
  table; the mapper table is a `switch` over the `kind` enum.
- **Server-authored only.** INSERT happens through
  `append_civic_event()` SECURITY DEFINER. No client can fabricate
  an event. This is the same trust model as `user_notifications`.
- **Uniform shape.** All consumers (profile timeline, district
  activity, header bell) read the same projection. No more N
  consumer-specific projections.
- **Backfillable.** A cron job or one-off migration can
  back-populate `civic_events` from the source-of-truth tables
  (`proposal_supports`, `mission_events`, etc.) without touching
  realtime or the bridge.
- **Public-safe projection is auditable.** `get_civic_events_for_profile`
  and `get_district_activity` are the only entry points. The
  `civic_events` table itself is `actor_id`-scoped (own-rows) for
  the `authenticated` role, so even if a future feature ships a bug
  that reads from the table directly, it cannot leak other users'
  events.

### Negative

- **One more place to write.** Each domain mutation that wants to
  appear in timelines must remember to call `append_civic_event()`.
  Mitigation: a `BEFORE INSERT` trigger on each source table can
  call `append_civic_event()` automatically. We adopt this pattern
  in Phase 4B for `proposal_supports`.
- **Realtime payload is one extra hop.** The bridge receives an
  INSERT on `civic_events` instead of an INSERT on
  `proposal_supports`. Negligible latency impact.
- **Storage grows.** Every event is one row. With realistic volume
  (thousands of supports, hundreds of conversions per month) this
  is well within Supabase free tier, but it is unbounded growth.
  Mitigation: a retention policy can be added later; not blocking.

### Neutral

- The source tables (`proposal_supports`, `mission_events`,
  `proposal_comments`) remain the source of truth for counts and
  authoritative state. `civic_events` is the **event stream**, not
  the data model.

## Alternatives considered

- **A (per-table realtime)** — rejected because it would require
  adding `proposal_supports`, `proposal_comments`,
  `proposal_collaborators`, `proposal_lifecycle_events`,
  `mission_events`, `evidence_submissions`, `community_follows` (and
  more, later) to the realtime publication, and writing N mappers
  with N privacy surfaces. The growth vector is unbounded.
- **C (skip realtime, keep polling only)** — rejected because the
  Phase B work already validated the bridge pattern for
  notifications. Polling-only proposals would make the inbox feel
  alive and the proposals feed feel dead, which is a worse user
  experience than the architectural debt we are avoiding.

## References

- `supabase/migrations/20260607010000_create_civic_events.sql`
- `src/services/civicEventsRepository.ts`
- `src/features/profile/hooks/usePublicProfile.ts`
- Phase 4B bridge extension: `src/lib/realtime/proposalRealtimeBridge.ts`
