# Proposals — Phase 4B: Realtime Bridge & Notification Wiring

## Scope

- Wire the existing **unused** notification hooks (`useUnreadNotificationCount`, `useMarkNotificationRead`) to real UI consumers.
- Extend the realtime bridge to consume `civic_events` (per ADR-0001) and emit a `proposal.support_changed` domain event when supporters are added.
- Extend `missionMutationEngine` to invalidate proposal queries when a support event lands.

## Why

The Phase 4 audit (see `PROPOSALS_PHASE4_PLAN.md`) found:

- `useUnreadNotificationCount` and `useLiveNotificationInbox` were exported but had **0 consumers** — the bell badge was always 0 and the inbox never went "live".
- The "Marcar como leídas" button on `/app/notificaciones` only mutated local component state — the row was unread again on next render after the realtime refresh.
- The realtime bridge was subscribed to `user_notifications` and `missions` only; the audit's decision was to add a `civic_events` channel (single append-only log, server-authored via `append_civic_event` SECURITY DEFINER).

## What changed

### 4B.1 — Migration: `proposal_supports` to realtime publication

File: `supabase/migrations/20260607030000_proposal_supports_realtime.sql`

- Adds `proposal_supports` to the `supabase_realtime` publication.
- Creates `proposal_supports_proposal_created_idx` for the delta RPC.

### 4B.2 — Migration: support event RPC + trigger

File: `supabase/migrations/20260607040000_proposal_support_event_rpc.sql`

- `get_proposal_support_delta(p_proposal uuid, p_since timestamptz)` — SECURITY DEFINER STABLE, returns `{count, last_supported_at}`. Cheap polling companion to the realtime channel.
- `trg_fanout_proposal_support` — AFTER INSERT trigger on `proposal_supports` that calls `append_civic_event('proposal.supported', ..., dedupe_key='proposal.supported:<proposal>:<user>')`. Idempotent: re-inserts on the same `(proposal, user)` collapse via the partial unique index on `dedupe_key` in `civic_events`.

### 4B.3 — Realtime bridge extension

Files:

- `src/lib/realtime/missionRealtime.ts`
- `src/lib/realtime/missionRealtimeBridge.ts`

Additions:

- New channel key: `'civic_events'` with filter `target_type=eq.proposal`.
- New domain event: `proposal.support_changed` (variant of `MissionDomainEvent`).
- `MissionDomainEvent` gains an optional `proposalId: string` field (additive).
- New mapper: `mapCivicEventPayloadToProposalSupport(row)` — pulls `proposal_id` from the `civic_events.payload` jsonb.
- The reconciliation planner now has a `proposal.support_changed` branch that produces a `MissionReconcilePlan` with `kind: "proposal_support_changed"`.

### 4B.4 — `missionMutationEngine` proposal-scope

File: `src/features/auth/mutations/missionMutationEngine.ts`

- `InvalidateRequest` gains an optional `proposalIds: readonly string[]` (additive).
- `SchedulerState.pending` gains `proposalIds: Set<string>`.
- `mergeScope` unions `proposalIds` from multiple concurrent requests.
- `flushPending` invalidates three query-key families per id:
  - `proposalKeys.detail(id)` (Phase 2A)
  - `proposalSupportKeys.byProposal(id)` (Phase 2A)
  - `proposalCoalitionKeys.byProposal(id)` (Phase 2A)
- Both re-schedule checks (`onCoalesce` boundaries) consider `proposalIds.size > 0`.

### 4B.5 — Header bell badge

New file: `src/components/HeaderBellBadge.tsx`

- Reads `useUnreadNotificationCount(currentUserId ?? undefined)`.
- Renders a `Bell` icon as a `Link` to `/app/notificaciones` with a small `9+` clamp badge when count > 0.
- Active state mirrors the bottom-nav "Explorar" pattern: same `rounded-lg` + `bg-muted` when on the notifications route.
- ARIA: `aria-label` switches between "Notificaciones" and "Tienes N notificaciones sin leer" (singular/plural agreement).
- Hidden when no `userId` (logged-out).

Wired into: `src/components/AppShell.tsx` — top header (`sticky top-0`, line 116) gains a `HeaderBellBadge` to the right of the (already-removed) search bar.

### 4B.6 — Notification read mutations

Files:

- `src/routes/app.notificaciones.tsx`
- `src/features/notifications/components/CivicFeed.tsx`
- `src/features/notifications/components/NotificationItem.tsx`

Changes:

- `CivicFeed` accepts two new optional props: `onMarkRead(id)` and `onMarkAllRead()`. Both are forwarded to the parent.
- `CivicFeed` keeps the local-state fallback so it still works as a presentational component in isolation (e.g. storybook, tests).
- `NotificationItem` gains an `onRead?: (id) => void` prop. When set, the row becomes a `role="button"` with `tabIndex=0` and supports keyboard activation (`Enter` / `Space`).
- `app.notificaciones.tsx` now:
  - Calls `markReadMutation.mutate(id)` on per-row click.
  - On "Marcar como leídas", reads the current unread rows from `dbRows` and fans out per-id mutations (TanStack Query auto-dedupes per-id). This avoids requiring a new `markAllRead` hook and reuses the single `useMarkNotificationRead` mutation that's already on the repository.

## Bundle impact

- `HeaderBellBadge`: ~1 kB; lazy via `AppShell` (top header).
- `app.notificaciones` chunk: 12.82 kB (was absorbed in the shared app chunk; now its own route).
- `missionMutationEngine` chunk: 20.08 kB (Phase 4B adds 2 imports + 1 set field — negligible delta).
- No new top-level dependencies; reuses `lucide-react`'s `Bell`.

## Rollback

1. Revert `src/components/AppShell.tsx` and delete `src/components/HeaderBellBadge.tsx` — removes the bell.
2. Revert `src/routes/app.notificaciones.tsx` and the two `CivicFeed` / `NotificationItem` props — strips the per-id mutation wiring.
3. Revert the realtime bridge + engine changes — the `civic_events` subscription is opt-in via the bridge's channel list; the `proposalIds` field on `InvalidateRequest` is additive.
4. To fully roll back: `drop_migration 20260607030000_proposal_supports_realtime` and `20260607040000_proposal_support_event_rpc` via a new down-migration. The trigger is `DROP TRIGGER IF EXISTS trg_fanout_proposal_support ON proposal_supports;`; the realtime removal needs `ALTER PUBLICATION supabase_realtime DROP TABLE proposal_supports;`.

## Tests

- `npm run typecheck` — passes.
- `npm run lint` — 0 new errors from Phase 4B files. (`NOTIFICATION_TYPE_LABELS` unused in `CivicFeed.tsx:12` is **pre-existing**.)
- `npm run build` — passes; chunks emitted as expected.
- `npm run test` — 3/3 realtime tests still pass.

## What's NOT in 4B

- **Comments / collaborators / lifecycle realtime**: deferred per ADR-0001 (single event log, scope kept minimal until query-key conventions stabilize).
- **Telemetry on RPC usage and realtime reconnect failures**: deferred to Phase 4D.8.
- **Server-side rate limiting on the delta RPC**: `get_proposal_support_delta` is read-only SECURITY DEFINER and lives behind RLS; abuse surface is low. Revisit in Phase 5 if usage patterns warrant it.
