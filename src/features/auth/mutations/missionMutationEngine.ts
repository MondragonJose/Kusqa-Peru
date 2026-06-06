/**
 * Mission write-engine — three responsibilities:
 *   A) applyOptimistic(entity, action)
 *   B) executeWrite(steps)
 *   C) reconcileCache(scope)
 *
 * Hardened for rapid clicks, overlapping mutations, and late refetches.
 */

import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { resolveAuthenticatedUserId } from "@/features/auth/mutations/authMutationContext";
import {
  reportMutationError,
  reportMutationPending,
  reportMutationSuccess,
  type MissionMutationKind,
} from "@/features/auth/mutations/mutationStatusStore";
import {
  missionKeys,
  userKeys,
  userMissionKeys,
  userProgressKeys,
  evidenceKeys,
} from "@/lib/queryKeys";
import type {
  Mission,
  User,
  UserMission,
  UserMissionStatus,
  UserTerritoryProgressView,
  CompletionState,
} from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WriteContext = {
  userId?: string;
  missionIds?: readonly string[];
};

export type InvalidateRequest = {
  userId?: string;
  missionIds?: readonly string[];
};

type QuerySnapshot = Array<{ key: QueryKey; data: unknown }>;

export type MutationWriteContext = {
  snapshot: QuerySnapshot;
  writeContext: WriteContext;
  userId?: string;
  writeSignature: string;
  deduped: boolean;
};

export type OptimisticPatch =
  | { entity: "missions"; action: "create"; mission: Mission }
  | { entity: "userMissions"; action: "join"; userId: string; mission: Mission }
  | {
      entity: "userMissions";
      action: "complete";
      userId: string;
      mission: Mission;
      xpEarned: number;
    };

// ---------------------------------------------------------------------------
// Concurrency: signatures, dedup, mission lanes, stale guards
// ---------------------------------------------------------------------------

const IS_DEV = import.meta.env.DEV;

type InflightWriteState = {
  signature: string;
  kind: MissionMutationKind;
  writeContext: WriteContext;
  refCount: number;
  optimisticApplied: boolean;
  snapshot: QuerySnapshot;
  keys: QueryKey[];
  startedAt: number;
  apiPromise: Promise<unknown> | null;
};

type ClientHardeningState = {
  inflight: Map<string, InflightWriteState>;
  laneTail: Map<string, Promise<void>>;
  keyPins: Map<string, { data: unknown; pinGeneration: number }>;
  keyPinGeneration: Map<string, number>;
  guardInstalled: boolean;
  unsubscribe?: () => void;
};

const clientState = new WeakMap<QueryClient, ClientHardeningState>();

function getClientState(queryClient: QueryClient): ClientHardeningState {
  let state = clientState.get(queryClient);
  if (!state) {
    state = {
      inflight: new Map(),
      laneTail: new Map(),
      keyPins: new Map(),
      keyPinGeneration: new Map(),
      guardInstalled: false,
    };
    clientState.set(queryClient, state);
    installStaleFetchGuard(queryClient, state);
  }
  return state;
}

function keyHash(key: QueryKey): string {
  return JSON.stringify(key);
}

export function mutationSignature(kind: MissionMutationKind, ctx: WriteContext): string {
  const missionId = ctx.missionIds?.[0] ?? "_catalog_";
  return `${kind}:${ctx.userId ?? "_anon_"}:${missionId}`;
}

function missionLaneKey(ctx: WriteContext): string | null {
  const missionId = ctx.missionIds?.[0];
  if (!ctx.userId || !missionId) return null;
  return `${ctx.userId}:${missionId}`;
}

function logWrite(
  phase: string,
  meta: {
    kind: MissionMutationKind;
    signature: string;
    userId?: string;
    missionId?: string;
    durationMs?: number;
    deduped?: boolean;
  },
): void {
  if (!IS_DEV) return;
  console.debug("[kusqa:write]", phase, {
    kind: meta.kind,
    signature: meta.signature,
    userId: meta.userId,
    missionId: meta.missionId,
    durationMs: meta.durationMs,
    deduped: meta.deduped,
  });
}

function installStaleFetchGuard(queryClient: QueryClient, state: ClientHardeningState): void {
  if (state.guardInstalled) return;
  state.guardInstalled = true;

  state.unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (!event || event.type !== "updated") return;

    const query = event.query;
    const hash = keyHash(query.queryKey);
    const pin = state.keyPins.get(hash);
    if (!pin) return;

    const actionType = event.action?.type;
    if (actionType !== "success" && actionType !== "fetch") return;

    const current = query.state.data;
    if (current === pin.data) return;

    const liveGeneration = state.keyPinGeneration.get(hash) ?? 0;
    if (liveGeneration > pin.pinGeneration) return;

    logWrite("stale-fetch-blocked", {
      kind: "joinMission",
      signature: hash,
      missionId: String(query.queryKey),
    });

    queryClient.setQueryData(query.queryKey, pin.data);
  });
}

function pinQueryKeys(queryClient: QueryClient, keys: QueryKey[]): void {
  const state = getClientState(queryClient);
  for (const key of keys) {
    const hash = keyHash(key);
    const generation = (state.keyPinGeneration.get(hash) ?? 0) + 1;
    state.keyPinGeneration.set(hash, generation);
    state.keyPins.set(hash, {
      data: queryClient.getQueryData(key),
      pinGeneration: generation,
    });
  }
}

function releaseQueryKeyPins(queryClient: QueryClient, keys: QueryKey[]): void {
  const state = getClientState(queryClient);
  for (const key of keys) {
    const hash = keyHash(key);
    state.keyPins.delete(hash);
    state.keyPinGeneration.delete(hash);
  }
}

function inflightCountForScope(state: ClientHardeningState, scope?: InvalidateRequest): number {
  if (!scope) return state.inflight.size;

  let count = 0;
  for (const entry of state.inflight.values()) {
    if (entry.refCount <= 0) continue;
    const overlapsUser = !scope.userId || entry.writeContext.userId === scope.userId;
    const overlapsMission =
      !scope.missionIds?.length ||
      scope.missionIds.some((id) => entry.writeContext.missionIds?.includes(id));
    if (overlapsUser && overlapsMission) count += entry.refCount;
  }
  return count;
}

function beginInflightWrite(
  queryClient: QueryClient,
  kind: MissionMutationKind,
  writeContext: WriteContext,
  snapshot: QuerySnapshot,
  keys: QueryKey[],
): { signature: string; deduped: boolean; snapshot: QuerySnapshot } {
  const state = getClientState(queryClient);
  const signature = mutationSignature(kind, writeContext);
  const existing = state.inflight.get(signature);

  if (existing && existing.refCount > 0) {
    existing.refCount += 1;
    logWrite("deduped", {
      kind,
      signature,
      userId: writeContext.userId,
      missionId: writeContext.missionIds?.[0],
      deduped: true,
    });
    return { signature, deduped: true, snapshot: existing.snapshot };
  }

  state.inflight.set(signature, {
    signature,
    kind,
    writeContext,
    refCount: 1,
    optimisticApplied: false,
    snapshot,
    keys,
    startedAt: performance.now(),
    apiPromise: null,
  });

  logWrite("start", {
    kind,
    signature,
    userId: writeContext.userId,
    missionId: writeContext.missionIds?.[0],
  });

  return { signature, deduped: false, snapshot };
}

function endInflightWrite(
  queryClient: QueryClient,
  signature: string,
  phase: "success" | "rollback",
): void {
  const state = getClientState(queryClient);
  const entry = state.inflight.get(signature);
  if (!entry) return;

  entry.refCount -= 1;
  if (entry.refCount > 0) return;

  releaseQueryKeyPins(queryClient, entry.keys);
  state.inflight.delete(signature);

  logWrite(phase, {
    kind: entry.kind,
    signature,
    userId: entry.writeContext.userId,
    missionId: entry.writeContext.missionIds?.[0],
    durationMs: Math.round(performance.now() - entry.startedAt),
  });
}

function markOptimisticApplied(queryClient: QueryClient, signature: string): boolean {
  const entry = getClientState(queryClient).inflight.get(signature);
  if (!entry) return false;
  if (entry.optimisticApplied) return false;
  entry.optimisticApplied = true;
  return true;
}

function runInMissionLane<T>(
  queryClient: QueryClient,
  writeContext: WriteContext,
  task: () => Promise<T>,
): Promise<T> {
  const lane = missionLaneKey(writeContext);
  if (!lane) return task();

  const state = getClientState(queryClient);
  const previous = state.laneTail.get(lane) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(task)
    .finally(() => {
      if (state.laneTail.get(lane) === next) {
        state.laneTail.delete(lane);
      }
    });

  state.laneTail.set(
    lane,
    next.then(() => undefined),
  );
  return next;
}

function getOrCreateApiPromise<T>(
  queryClient: QueryClient,
  signature: string,
  factory: () => Promise<T>,
): Promise<T> {
  const entry = getClientState(queryClient).inflight.get(signature);
  if (!entry) return factory();

  if (!entry.apiPromise) {
    entry.apiPromise = factory();
  }
  return entry.apiPromise as Promise<T>;
}

function protectedSetQueryData<T>(
  queryClient: QueryClient,
  key: QueryKey,
  updater: (current: T | undefined) => T,
): void {
  const state = getClientState(queryClient);
  const hash = keyHash(key);
  const generation = (state.keyPinGeneration.get(hash) ?? 0) + 1;
  state.keyPinGeneration.set(hash, generation);

  const next = updater(queryClient.getQueryData<T>(key));
  queryClient.setQueryData(key, next);
  state.keyPins.set(hash, { data: next, pinGeneration: generation });
}

/** Keys we snapshot/rollback — only where optimistic patches are visible before refetch. */
function rollbackKeys(kind: MissionMutationKind, ctx: WriteContext): QueryKey[] {
  switch (kind) {
    case "createMission":
      return [missionKeys.all];
    case "joinMission":
      return ctx.userId ? [userMissionKeys.all(ctx.userId)] : [];
    case "completeMission":
      return ctx.userId
        ? [
            userMissionKeys.all(ctx.userId),
            userMissionKeys.completed(ctx.userId),
            userProgressKeys.territory("live"),
            userKeys.current,
          ]
        : [];
    case "submitEvidence":
      return ctx.userId
        ? [
            userMissionKeys.all(ctx.userId),
            evidenceKeys.byMission(ctx.missionIds?.[0] ?? ""),
            evidenceKeys.byUser(ctx.userId),
            evidenceKeys.completionState(ctx.userId, ctx.missionIds?.[0] ?? ""),
          ]
        : [];
    case "verifyEvidence":
      return ctx.userId
        ? [
            userMissionKeys.all(ctx.userId),
            userMissionKeys.completed(ctx.userId),
            userProgressKeys.territory("live"),
            userKeys.current,
            evidenceKeys.byMission(ctx.missionIds?.[0] ?? ""),
            evidenceKeys.byUser(ctx.userId),
            evidenceKeys.completionState(ctx.userId, ctx.missionIds?.[0] ?? ""),
          ]
        : [];
  }
}

// ---------------------------------------------------------------------------
// A) applyOptimistic
// ---------------------------------------------------------------------------

function buildOptimisticUserMission(
  mission: Mission,
  userId: string,
  status: UserMissionStatus,
  xpEarned: number | null = null,
): UserMission {
  const completionState: CompletionState = status === "completed" ? "completed" : "not_completed";
  return {
    id: `optimistic-${mission.id}-${status}`,
    userId,
    missionId: mission.id,
    status,
    completionState,
    joinedAt: new Date().toISOString(),
    completedAt: status === "completed" ? new Date().toISOString() : null,
    xpEarned,
    mission,
  };
}

export function applyOptimistic(queryClient: QueryClient, patch: OptimisticPatch): void {
  switch (patch.action) {
    case "create":
      protectedSetQueryData<Mission[]>(queryClient, missionKeys.all, (current) => [
        patch.mission,
        ...(current ?? []),
      ]);
      break;
    case "join": {
      const entry = buildOptimisticUserMission(patch.mission, patch.userId, "in_progress");
      protectedSetQueryData<UserMission[]>(
        queryClient,
        userMissionKeys.all(patch.userId),
        (current) => {
          const list = current ?? [];
          if (list.some((row) => row.missionId === patch.mission.id)) return list;
          return [entry, ...list];
        },
      );
      break;
    }
    case "complete": {
      const { userId, mission, xpEarned } = patch;
      const completedEntry = buildOptimisticUserMission(mission, userId, "completed", xpEarned);

      protectedSetQueryData<UserMission[]>(queryClient, userMissionKeys.all(userId), (current) =>
        (current ?? []).filter((row) => row.missionId !== mission.id),
      );

      protectedSetQueryData<UserMission[]>(
        queryClient,
        userMissionKeys.completed(userId),
        (current) => {
          const list = (current ?? []).filter((row) => row.missionId !== mission.id);
          return [completedEntry, ...list];
        },
      );

      const territoryKey = userProgressKeys.territory("live");
      const territory = queryClient.getQueryData<UserTerritoryProgressView>(territoryKey);
      if (territory) {
        const baseline = territory.totalMissionsCompleted;
        protectedSetQueryData<UserTerritoryProgressView>(queryClient, territoryKey, (current) => {
          const base = current ?? territory;
          if (base.totalMissionsCompleted >= baseline + 1) return base;
          return { ...base, totalMissionsCompleted: baseline + 1 };
        });
      }

      const currentUser = queryClient.getQueryData<User>(userKeys.current);
      if (currentUser) {
        const targetXp = currentUser.xp + xpEarned;
        const targetMissions = (currentUser.missionsDone ?? 0) + 1;
        protectedSetQueryData<User>(queryClient, userKeys.current, (current) => {
          const base = current ?? currentUser;
          if (base.xp >= targetXp && (base.missionsDone ?? 0) >= targetMissions) return base;
          return { ...base, xp: targetXp, missionsDone: targetMissions };
        });
      }
      break;
    }
  }
}

export const applyOptimisticCreate = (qc: QueryClient, mission: Mission) =>
  applyOptimistic(qc, { entity: "missions", action: "create", mission });

export const applyOptimisticJoin = (qc: QueryClient, userId: string, mission: Mission) =>
  applyOptimistic(qc, { entity: "userMissions", action: "join", userId, mission });

export const applyOptimisticComplete = (
  qc: QueryClient,
  userId: string,
  mission: Mission,
  xpEarned: number,
) => applyOptimistic(qc, { entity: "userMissions", action: "complete", userId, mission, xpEarned });

export function getMissionFromCache(
  queryClient: QueryClient,
  missionId: string,
): Mission | undefined {
  const detail = queryClient.getQueryData<Mission>(missionKeys.detail(missionId));
  if (detail) return detail;
  return queryClient.getQueryData<Mission[]>(missionKeys.all)?.find((m) => m.id === missionId);
}

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

function captureQuerySnapshot(queryClient: QueryClient, keys: QueryKey[]): QuerySnapshot {
  return keys.map((key) => ({ key, data: queryClient.getQueryData(key) }));
}

function restoreQuerySnapshot(queryClient: QueryClient, snapshot: QuerySnapshot): void {
  for (const { key, data } of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

async function cancelQueryKeys(queryClient: QueryClient, keys: QueryKey[]): Promise<void> {
  await Promise.all(keys.map((key) => queryClient.cancelQueries({ queryKey: key })));
}

// ---------------------------------------------------------------------------
// C) reconcileCache
// ---------------------------------------------------------------------------

type SchedulerState = {
  pending: { userId?: string; missionIds: Set<string> };
  flushPromise: Promise<void> | null;
  scheduled: boolean;
};

const schedulers = new WeakMap<QueryClient, SchedulerState>();

function getScheduler(queryClient: QueryClient): SchedulerState {
  let state = schedulers.get(queryClient);
  if (!state) {
    state = { pending: { missionIds: new Set() }, flushPromise: null, scheduled: false };
    schedulers.set(queryClient, state);
  }
  return state;
}

function mergeScope(state: SchedulerState, scope?: InvalidateRequest): void {
  if (!scope) return;
  if (scope.userId) state.pending.userId = scope.userId;
  for (const id of scope.missionIds ?? []) state.pending.missionIds.add(id);
}

async function flushPending(queryClient: QueryClient, state: SchedulerState): Promise<void> {
  const pendingScope: InvalidateRequest = {
    userId: state.pending.userId,
    missionIds: [...state.pending.missionIds],
  };

  const hardening = getClientState(queryClient);
  if (inflightCountForScope(hardening, pendingScope) > 0) {
    state.scheduled = true;
    queueMicrotask(() => reconcileCache(queryClient, pendingScope, "schedule"));
    return;
  }

  const { userId, missionIds } = state.pending;
  state.pending = { missionIds: new Set() };
  state.scheduled = false;

  try {
    const tasks: Promise<void>[] = [
      queryClient.invalidateQueries({ queryKey: missionKeys.all }),
      queryClient.invalidateQueries({ queryKey: userProgressKeys.root }),
      queryClient.invalidateQueries({ queryKey: userMissionKeys.root }),
      queryClient.invalidateQueries({ queryKey: userKeys.current }),
    ];
    for (const missionId of missionIds) {
      tasks.push(queryClient.invalidateQueries({ queryKey: missionKeys.detail(missionId) }));
    }
    if (userId) {
      tasks.push(
        queryClient.invalidateQueries({ queryKey: userMissionKeys.all(userId) }),
        queryClient.invalidateQueries({ queryKey: userMissionKeys.completed(userId) }),
        queryClient.invalidateQueries({ queryKey: userProgressKeys.territory(userId) }),
        queryClient.invalidateQueries({ queryKey: userProgressKeys.territory("live") }),
        queryClient.invalidateQueries({ queryKey: userKeys.profileRow(userId) }),
      );
    }
    await Promise.all(tasks);
  } catch {
    // Non-fatal: UI keeps optimistic cache until staleTime/refetch.
  }
}

export function reconcileCache(
  queryClient: QueryClient,
  scope?: InvalidateRequest,
  mode: "schedule" | "flush" | "both" = "schedule",
): Promise<void> | void {
  const state = getScheduler(queryClient);

  if (scope && (mode === "schedule" || mode === "both")) {
    try {
      mergeScope(state, scope);
      if (!state.scheduled) {
        state.scheduled = true;
        queueMicrotask(() => {
          if (!state.flushPromise) {
            state.flushPromise = flushPending(queryClient, state).finally(() => {
              state.flushPromise = null;
              if (state.pending.missionIds.size > 0 || state.pending.userId) {
                reconcileCache(
                  queryClient,
                  { userId: state.pending.userId, missionIds: [...state.pending.missionIds] },
                  "schedule",
                );
              }
            });
          }
        });
      }
    } catch {
      /* non-fatal */
    }
  }

  if (mode === "flush" || mode === "both") {
    return (async () => {
      try {
        if (state.flushPromise) await state.flushPromise;
        if (state.pending.missionIds.size > 0 || state.pending.userId) {
          state.scheduled = false;
          await flushPending(queryClient, state);
        }
      } catch {
        /* non-fatal */
      }
    })();
  }
}

export const scheduleMissionCacheInvalidation = (
  queryClient: QueryClient,
  scope?: InvalidateRequest,
) => reconcileCache(queryClient, scope, "schedule");

export const flushMissionCacheInvalidation = (queryClient: QueryClient) =>
  reconcileCache(queryClient, undefined, "flush") as Promise<void>;

// ---------------------------------------------------------------------------
// B) executeWrite
// ---------------------------------------------------------------------------

export type RunMissionWriteOptions<TResult> = {
  kind: MissionMutationKind;
  writeContext: WriteContext;
  invalidate?: InvalidateRequest;
  optimistic?: (queryClient: QueryClient) => void;
  steps: Array<() => Promise<unknown>>;
  mapResults?: (results: unknown[]) => TResult;
};

export async function runMissionWrite<TResult>(
  queryClient: QueryClient,
  options: RunMissionWriteOptions<TResult>,
): Promise<TResult> {
  const { kind, writeContext, steps, optimistic, invalidate, mapResults } = options;
  const keys = rollbackKeys(kind, writeContext);
  const snapshot = captureQuerySnapshot(queryClient, keys);
  const {
    signature,
    deduped,
    snapshot: leaderSnapshot,
  } = beginInflightWrite(queryClient, kind, writeContext, snapshot, keys);

  if (deduped) {
    return getOrCreateApiPromise(queryClient, signature, async () => {
      const results: unknown[] = [];
      for (const step of steps) results.push(await step());
      return (mapResults ? mapResults(results) : results) as TResult;
    });
  }

  pinQueryKeys(queryClient, keys);
  await cancelQueryKeys(queryClient, keys);

  if (optimistic && markOptimisticApplied(queryClient, signature)) {
    optimistic(queryClient);
    logWrite("optimistic", {
      kind,
      signature,
      userId: writeContext.userId,
      missionId: writeContext.missionIds?.[0],
    });
  }

  return runInMissionLane(queryClient, writeContext, () =>
    executeWrite({
      queryClient,
      kind,
      writeContext,
      signature,
      snapshot: leaderSnapshot,
      keys,
      steps,
      onSuccess: () => {
        if (invalidate) reconcileCache(queryClient, invalidate, "both");
        else void reconcileCache(queryClient, undefined, "flush");
      },
      mapResults,
    }),
  );
}

async function executeWrite<TResult>({
  queryClient,
  kind,
  writeContext,
  signature,
  snapshot,
  keys,
  steps,
  onSuccess,
  mapResults,
}: {
  queryClient: QueryClient;
  kind: MissionMutationKind;
  writeContext: WriteContext;
  signature: string;
  snapshot: QuerySnapshot;
  keys: QueryKey[];
  steps: Array<() => Promise<unknown>>;
  onSuccess?: () => void | Promise<void>;
  mapResults?: (results: unknown[]) => TResult;
}): Promise<TResult> {
  reportMutationPending(kind);

  try {
    const results = await getOrCreateApiPromise(queryClient, signature, async () => {
      const settled: unknown[] = [];
      for (const step of steps) settled.push(await step());
      return settled;
    });

    logWrite("executed", {
      kind,
      signature,
      userId: writeContext.userId,
      missionId: writeContext.missionIds?.[0],
    });

    await onSuccess?.();
    reportMutationSuccess(kind);
    endInflightWrite(queryClient, signature, "success");
    return (mapResults ? mapResults(results as unknown[]) : results) as TResult;
  } catch (error) {
    restoreQuerySnapshot(queryClient, snapshot);
    releaseQueryKeyPins(queryClient, keys);
    reportMutationError(kind, error instanceof Error ? error : new Error(String(error)));
    endInflightWrite(queryClient, signature, "rollback");
    throw error;
  }
}

// ---------------------------------------------------------------------------
// React hook factory
// ---------------------------------------------------------------------------

type MissionMutationConfig<TInput, TOutput, TError> = {
  kind: MissionMutationKind;
  requiresAuth?: boolean;
  mutationFn: (queryClient: QueryClient, input: TInput) => Promise<TOutput>;
  writeContext: (input: TInput, userId?: string) => WriteContext;
  invalidate?: (input: TInput, output: TOutput, userId?: string) => InvalidateRequest;
  optimistic?: (queryClient: QueryClient, input: TInput, userId?: string) => void;
};

export function createMissionMutation<TInput, TOutput, TError = Error>(
  config: MissionMutationConfig<TInput, TOutput, TError>,
) {
  return function useMissionMutation(
    options?: Omit<
      UseMutationOptions<TOutput, TError, TInput, MutationWriteContext>,
      "mutationFn" | "onMutate" | "onError" | "onSuccess" | "onSettled"
    >,
  ) {
    const queryClient = useQueryClient();
    const requiresAuth = config.requiresAuth !== false;
    // Typed alias to access lifecycle call-through delegates intentionally omitted from the public API
    const callThrough = options as
      | UseMutationOptions<TOutput, TError, TInput, MutationWriteContext>
      | undefined;

    return useMutation<TOutput, TError, TInput, MutationWriteContext>({
      ...options,
      mutationFn: async (input) => {
        let userId: string | undefined;
        if (requiresAuth) userId = await resolveAuthenticatedUserId(queryClient);
        const writeContext = config.writeContext(input, userId);
        const signature = mutationSignature(config.kind, writeContext);

        return runInMissionLane(queryClient, writeContext, () =>
          getOrCreateApiPromise(queryClient, signature, () =>
            config.mutationFn(queryClient, input),
          ),
        );
      },
      onMutate: async (input) => {
        try {
          let userId: string | undefined;
          if (requiresAuth) userId = await resolveAuthenticatedUserId(queryClient);

          const writeContext = config.writeContext(input, userId);
          const keys = rollbackKeys(config.kind, writeContext);
          const captured = captureQuerySnapshot(queryClient, keys);
          const { signature, deduped, snapshot } = beginInflightWrite(
            queryClient,
            config.kind,
            writeContext,
            captured,
            keys,
          );

          if (!deduped) {
            reportMutationPending(config.kind);
            pinQueryKeys(queryClient, keys);
            await cancelQueryKeys(queryClient, keys);

            if (config.optimistic && markOptimisticApplied(queryClient, signature)) {
              config.optimistic(queryClient, input, userId);
              logWrite("optimistic", {
                kind: config.kind,
                signature,
                userId: writeContext.userId,
                missionId: writeContext.missionIds?.[0],
              });
            }
          }

          const extra = callThrough?.onMutate
            ? await (callThrough.onMutate as (v: TInput) => Promise<unknown>)(input)
            : undefined;
          return {
            snapshot,
            writeContext,
            userId,
            writeSignature: signature,
            deduped,
            ...(typeof extra === "object" && extra !== null ? extra : {}),
          };
        } catch (error) {
          reportMutationError(
            config.kind,
            error instanceof Error ? error : new Error(String(error)),
          );
          throw error;
        }
      },
      onError: (error, input, context, meta) => {
        if (context && !context.deduped) {
          restoreQuerySnapshot(queryClient, context.snapshot);
          releaseQueryKeyPins(queryClient, rollbackKeys(config.kind, context.writeContext));
        }
        if (context?.writeSignature) {
          endInflightWrite(queryClient, context.writeSignature, "rollback");
        }
        if (!context?.deduped) {
          reportMutationError(
            config.kind,
            error instanceof Error ? error : new Error(String(error)),
          );
        }
        callThrough?.onError?.(error, input, context, meta);
      },
      onSuccess: (output, input, context, meta) => {
        if (!context?.deduped) {
          reportMutationSuccess(config.kind);
          const scope = config.invalidate?.(input, output, context?.userId);
          if (scope) reconcileCache(queryClient, scope, "schedule");
        }
        callThrough?.onSuccess?.(output, input, context, meta);
      },
      onSettled: (_data, error, input, context, meta) => {
        if (context?.writeSignature && !error) {
          endInflightWrite(queryClient, context.writeSignature, "success");
        }
        callThrough?.onSettled?.(_data, error, input, context, meta);
      },
    });
  };
}

export function useMissionWriteRunner() {
  const queryClient = useQueryClient();
  return useCallback(
    <TResult>(options: RunMissionWriteOptions<TResult>) => runMissionWrite(queryClient, options),
    [queryClient],
  );
}

/** @deprecated Use runMissionWrite */
export const runMissionTransaction = runMissionWrite;

/** True when local optimistic writes are active (skip remote realtime invalidation). */
export function hasLocalWriteInFlight(
  queryClient: QueryClient,
  scope?: InvalidateRequest,
): boolean {
  return inflightCountForScope(getClientState(queryClient), scope) > 0;
}

/** @deprecated Rollback keys are derived from mutation kind */
export const WRITE_TOUCH = {
  create: ["missions"],
  join: ["userMissions"],
  complete: ["userMissions", "userProgress", "user"],
} as const;
