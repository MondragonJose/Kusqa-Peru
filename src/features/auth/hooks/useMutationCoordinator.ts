/**
 * Hook: run grouped mission writes (sequential steps, one invalidation flush).
 */

import {
  useMissionWriteRunner,
  type RunMissionWriteOptions,
} from "@/features/auth/mutations/missionMutationEngine";

/** @deprecated Prefer useMissionWriteRunner */
export type RunMissionTransactionOptions<TResult> = RunMissionWriteOptions<TResult>;

export function useMutationCoordinator() {
  const runTransaction = useMissionWriteRunner();
  return { runTransaction, runWrite: runTransaction };
}

export { useMissionWriteRunner };
