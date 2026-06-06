/**
 * Global mutation phase tracking for UI feedback (no React Query dependency).
 */

export type MissionMutationKind =
  | "createMission"
  | "joinMission"
  | "completeMission"
  | "submitEvidence"
  | "verifyEvidence";

export type MutationPhase = "idle" | "pending" | "success" | "error";

export type MutationKindState = {
  phase: MutationPhase;
  pendingCount: number;
  error: Error | null;
};

export type UnifiedMissionMutationStatus = {
  phase: MutationPhase;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  activeKinds: MissionMutationKind[];
  lastError: Error | null;
  byKind: Record<MissionMutationKind, MutationKindState>;
};

const KINDS: MissionMutationKind[] = [
  "createMission",
  "joinMission",
  "completeMission",
  "submitEvidence",
  "verifyEvidence",
];

function createInitialKindState(): MutationKindState {
  return { phase: "idle", pendingCount: 0, error: null };
}

function createInitialByKind(): Record<MissionMutationKind, MutationKindState> {
  return {
    createMission: createInitialKindState(),
    joinMission: createInitialKindState(),
    completeMission: createInitialKindState(),
    submitEvidence: createInitialKindState(),
    verifyEvidence: createInitialKindState(),
  };
}

let byKind = createInitialByKind();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function recomputePhase(entry: MutationKindState): MutationPhase {
  if (entry.pendingCount > 0) return "pending";
  if (entry.error) return "error";
  return entry.phase;
}

export function subscribeMissionMutationStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getMissionMutationStatusSnapshot(): Record<MissionMutationKind, MutationKindState> {
  return byKind;
}

export function getServerMissionMutationStatusSnapshot(): Record<
  MissionMutationKind,
  MutationKindState
> {
  return byKind;
}

export function reportMutationPending(kind: MissionMutationKind): void {
  const entry = byKind[kind];
  byKind = {
    ...byKind,
    [kind]: {
      ...entry,
      pendingCount: entry.pendingCount + 1,
      phase: "pending",
      error: null,
    },
  };
  notify();
}

export function reportMutationSuccess(kind: MissionMutationKind): void {
  const entry = byKind[kind];
  const pendingCount = Math.max(0, entry.pendingCount - 1);
  byKind = {
    ...byKind,
    [kind]: {
      pendingCount,
      phase: pendingCount > 0 ? "pending" : "success",
      error: null,
    },
  };
  notify();
}

export function reportMutationError(kind: MissionMutationKind, error: Error): void {
  const entry = byKind[kind];
  const pendingCount = Math.max(0, entry.pendingCount - 1);
  byKind = {
    ...byKind,
    [kind]: {
      pendingCount,
      phase: pendingCount > 0 ? "pending" : "error",
      error,
    },
  };
  notify();
}

export function resetMutationKindStatus(kind: MissionMutationKind): void {
  byKind = {
    ...byKind,
    [kind]: createInitialKindState(),
  };
  notify();
}

export function deriveUnifiedMissionMutationStatus(
  snapshot: Record<MissionMutationKind, MutationKindState>,
): UnifiedMissionMutationStatus {
  const activeKinds = KINDS.filter((kind) => snapshot[kind].pendingCount > 0);
  const isPending = activeKinds.length > 0;
  const errors = KINDS.map((kind) => snapshot[kind].error).filter(
    (error): error is Error => error !== null,
  );
  const lastError = errors.at(-1) ?? null;
  const isError = !isPending && lastError !== null;
  const isSuccess =
    !isPending && !isError && KINDS.some((kind) => snapshot[kind].phase === "success");
  const phase: MutationPhase = isPending
    ? "pending"
    : isError
      ? "error"
      : isSuccess
        ? "success"
        : "idle";

  return {
    phase,
    isPending,
    isSuccess,
    isError,
    isIdle: phase === "idle",
    activeKinds,
    lastError,
    byKind: snapshot,
  };
}
