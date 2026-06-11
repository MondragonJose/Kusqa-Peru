# KUSQA Phase B — Operational Readiness

## 1. Auditoría operacional

| Área              | Antes             | Phase B                                                 |
| ----------------- | ----------------- | ------------------------------------------------------- |
| Multi-device sync | Pins locales only | Supabase Realtime + debounced reconcile                 |
| Evidencias        | UI placeholder    | `mission_evidence` + private bucket + upload pipeline   |
| Notificaciones    | Mock samples      | `user_notifications` + DB fan-out from `mission_events` |
| Moderación        | Ninguna           | `moderation_reports` queue                              |
| Observabilidad    | `[kusqa:rpc]` DEV | `[kusqa:telemetry]` + Sentry/PostHog shims              |
| Admin             | Manual SQL ad-hoc | `scripts/ops/verify_consistency.sql` + admin RPC        |

## 2. Riesgos reales

1. **Realtime sin RLS** — publicar tablas sin policies bloquea leaks; habilitar RLS antes de prod.
2. **Storage orphans** — upload OK + DB fail compensado con delete; periodic cleanup needed.
3. **Invalidation storms** — mitigado con debounce 400ms + `hasLocalWriteInFlight`.
4. **Notification fan-out** — dedupe por `dedupe_key` en trigger.
5. **Telemetry PII** — no enviar captions/paths a third-party sin scrubbing.

## 3. Arquitectura Phase B

```
┌─────────────────────────────────────────────────────────┐
│ App (optimistic UX unchanged)                            │
├─────────────────────────────────────────────────────────┤
│ missionMutationEngine │ MissionRealtimeSync (optional)   │
├───────────────────────┴─────────────────────────────────┤
│ repositories: userMission, evidence, notification, mod    │
├─────────────────────────────────────────────────────────┤
│ Supabase: RPC + Realtime + Storage + triggers             │
├─────────────────────────────────────────────────────────┤
│ PostgreSQL: constraints + mission_events + fan-out        │
└─────────────────────────────────────────────────────────┘
```

## 4. Realtime reconciliation semantics

1. Remote `postgres_changes` → `MissionDomainEvent`
2. If `hasLocalWriteInFlight(scope)` → skip (metric: `realtime.reconcile.skipped`)
3. Else `planRealtimeReconciliation` → `reconcileCache(schedule)` debounced
4. Single flush per burst — no infinite loops

**Flags:** `VITE_USE_REALTIME_SYNC=true` + `VITE_USE_LIVE_USER=true`

## 5. Evidence upload lifecycle

1. Client validates mime + size (`evidenceStorage`)
2. Path: `{userId}/{missionId}/{evidenceId}.{ext}`
3. Upload with 3 retries
4. Insert `mission_evidence` row (`moderation_status=pending`)
5. Signed URL for preview (1h)
6. On DB failure → delete storage object

**Flag:** `VITE_EVIDENCE_UPLOAD_ENABLED=true`

## 6. Notifications

- Trigger on `mission_events` INSERT → `user_notifications`
- Types: join, complete, xp_granted
- Hooks: `useLiveNotificationInbox`, `useUnreadNotificationCount` (UI still on samples)

## 7. Observability

| Signal       | Where                            |
| ------------ | -------------------------------- |
| RPC          | `[kusqa:rpc]`                    |
| Realtime     | `[kusqa:telemetry] realtime.*`   |
| Uploads      | `upload.start/success/failure`   |
| DEV counters | `getOperationalMetricCounters()` |

Enable: `VITE_TELEMETRY_ENABLED=true`, optional `VITE_SENTRY_DSN`, `VITE_POSTHOG_KEY`

## 8. Rollout plan

| Week | Action                                                   |
| ---- | -------------------------------------------------------- |
| 1    | Apply `20260526120000`, `20260526120100` migrations      |
| 1    | Enable RLS policies (uncomment in migration / dashboard) |
| 2    | Staging: realtime + evidence upload                      |
| 2    | Run `scripts/ops/verify_consistency.sql` daily           |
| 3    | Production: realtime for beta users                      |
| 4    | Wire `app.notificaciones` to `useLiveNotificationInbox`  |

## 9. Archivos nuevos (referencia)

- `supabase/migrations/20260526120000_phase_b_operational_readiness.sql`
- `supabase/migrations/20260526120100_admin_ops_functions.sql`
- `src/lib/realtime/missionRealtimeBridge.ts`
- `src/hooks/useMissionRealtimeSync.ts`
- `src/services/storage/evidenceStorage.ts`
- `src/services/evidenceRepository.ts`
- `src/services/notificationRepository.ts`
- `src/services/moderationRepository.ts`
- `src/lib/telemetry/*`

## 10. Futuro (no scope)

- Push notifications (FCM/APNs) via edge function
- Image compression worker
- Moderation admin UI
- Orphan storage cron job
