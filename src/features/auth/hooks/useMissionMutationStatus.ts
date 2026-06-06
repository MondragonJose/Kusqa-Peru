/**
 * Unified + per-kind mutation status for UI feedback.
 */

import { useSyncExternalStore } from "react";
import {
  deriveUnifiedMissionMutationStatus,
  getMissionMutationStatusSnapshot,
  getServerMissionMutationStatusSnapshot,
  subscribeMissionMutationStatus,
  type MissionMutationKind,
  type MutationKindState,
  type UnifiedMissionMutationStatus,
} from "@/features/auth/mutations/mutationStatusStore";

export function useMissionMutationKindStatus(kind: MissionMutationKind): MutationKindState {
  const snapshot = useSyncExternalStore(
    subscribeMissionMutationStatus,
    getMissionMutationStatusSnapshot,
    getServerMissionMutationStatusSnapshot,
  );
  return snapshot[kind];
}

export function useUnifiedMissionMutationStatus(): UnifiedMissionMutationStatus {
  const snapshot = useSyncExternalStore(
    subscribeMissionMutationStatus,
    getMissionMutationStatusSnapshot,
    getServerMissionMutationStatusSnapshot,
  );
  return deriveUnifiedMissionMutationStatus(snapshot);
}
