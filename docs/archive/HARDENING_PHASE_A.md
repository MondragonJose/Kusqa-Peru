# KUSQA — Phase A Backend Hardening

## 1. Auditoría del estado actual (pre-Phase A)

| Capa | Estado | Gap |
|------|--------|-----|
| Frontend write | `missionMutationEngine` — dedup, lanes, pins, reconcile | Fuerte |
| Repositories | `userMissionRepository` + RPC adapters | Client podía pasar XP |
| PostgreSQL | `user_missions` unique + RPC básicos | Sin CHECKs de estado, sin audit |
| Economía | `DEFAULT_XP=320` en mapper | No column `xp_reward` |
| Tests | Ninguno en CI | Riesgo regresión RPC |
| Realtime | No implementado | Multi-device eventual |

## 2. Riesgos detectados

1. **XP spoofing** — `completeMission(userId, missionId, xpEarned)` confiaba en cliente.
2. **Estados imposibles** — `in_progress` con `xp_earned` o `completed` sin `completed_at`.
3. **Doble complete multi-device** — mitigado en frontend, no en DB antes de idempotent RPC.
4. **Refetch tardío** — mitigado por pins en engine; realtime aún no reconcilia cross-device.
5. **Legacy path** — dos implementaciones divergentes (RPC vs insert/update).

## 3. Plan incremental implementado

| # | Entregable | Archivo(s) |
|---|------------|------------|
| 1 | Constraints + cleanup | `20260525120000_schema_constraints_hardening.sql` |
| 2 | Authoritative XP + audit RPCs | `20260525120100_authoritative_xp_audit_rpcs.sql` |
| 3 | Repository + Zod | `userMissionRepository.ts`, `userMissionRpc*.ts` |
| 4 | Hook input `{ missionId }` only | `useCompleteUserMission.ts` |
| 5 | Realtime prep | `src/lib/realtime/missionRealtime.ts` |
| 6 | Tests | Vitest + SQL harness |
| 7 | Legacy sunset doc | `LEGACY_PATH_SUNSET.md` |

## 4. Cambios por archivo

- `supabase/migrations/20260525120000_*` — `xp_reward`, CHECKs, `mission_events`, indexes
- `supabase/migrations/20260525120100_*` — RPC sin `p_xp_earned`, `append_mission_event`
- `missionRepository.ts` — `xp` desde `xp_reward`
- `userMissionRepository.ts` — overload deprecated XP; legacy usa `resolveAuthoritativeMissionXp`
- `useCompleteUserMission.ts` — optimista desde `mission.xp` cache; servidor ignora input XP

## 5. Flujo transaccional objetivo

```
useCompleteUserMission({ missionId })
  → missionMutationEngine (optimistic con mission.xp del cache)
  → userMissionRepository.completeMission(userId, missionId)
  → complete_mission_transaction(p_mission_id)
  → resolve_mission_xp_reward()
  → UPDATE user_missions + profiles + user_progress (atomic)
  → INSERT mission_events
  → reconcileCache
```

## 6. Rollout

1. Apply migrations en staging.
2. `VITE_USE_RPC_TRANSACTIONS=true`
3. `npm run test` + `npm run test:rpc` (con env de staging).
4. Verificar `mission_events` y constraints.
5. Producción + monitoreo 2 semanas.
6. Seguir `LEGACY_PATH_SUNSET.md`.

## 7. Regresiones posibles

| Área | Mitigación |
|------|------------|
| Migration cleanup falla | Revisar filas corruptas antes de CHECKs |
| UI pasa `xpEarned` | Overload ignorado + hook solo `missionId` |
| Optimistic XP ≠ server | Alinear `missions.xp_reward` con catálogo |
| RPC signature change | Drop old `(uuid, integer)` en migración |

## 8. Futuro (no en scope)

- Realtime channels wired a `planRealtimeReconciliation`
- Level calculation SQL function
- Admin repair RPC → `rollback_critical` events
