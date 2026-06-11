# Legacy mission write path — sunset plan

## Current state

| Path   | Trigger                          | Backend                                                     |
| ------ | -------------------------------- | ----------------------------------------------------------- |
| RPC    | `VITE_USE_RPC_TRANSACTIONS=true` | `join_mission_transaction` / `complete_mission_transaction` |
| Legacy | flag `false` (default)           | direct `user_missions` insert/update                        |

## Dependencies

- **Hooks**: `useJoinUserMission`, `useCompleteUserMission` → `userMissionRepository` only
- **Engine**: `missionMutationEngine` — agnostic to RPC vs legacy
- **No UI route** calls legacy directly

## Rollout stages

### Stage 1 — Staging validation (current)

- [ ] Apply migrations `20260525120000`, `20260525120100`
- [ ] Enable `VITE_USE_RPC_TRANSACTIONS=true` in staging
- [ ] Run `npm run test:rpc` against staging Supabase
- [ ] Monitor `[kusqa:rpc]` DEV logs + `mission_events` table

### Stage 2 — Production RPC default

- [ ] Enable RPC flag in production
- [ ] Keep legacy code path for 2 weeks
- [ ] Alert on legacy path usage (temporary DEV log if legacy invoked)

### Stage 3 — Legacy removal

- [ ] Remove `joinMissionLegacy` / `completeMissionLegacy`
- [ ] Remove `VITE_USE_RPC_TRANSACTIONS` flag (RPC always on)
- [ ] Drop `complete_mission_transaction(uuid, integer)` overload if still present

## Risk matrix

| Risk                     | Mitigation                                                             |
| ------------------------ | ---------------------------------------------------------------------- |
| RPC not deployed         | Feature flag rollback to legacy                                        |
| XP mismatch UI vs server | Optimistic uses catalog `mission.xp`; server uses `missions.xp_reward` |
| RLS blocks RPC           | `SECURITY DEFINER` + `auth.uid()` checks                               |

## Coverage required before Stage 3

- All items in `supabase/tests/rpc_mission_transactions.test.sql`
- Vitest schema + invariant suites green
- Manual: double-click join/complete on map → perfil navigation
